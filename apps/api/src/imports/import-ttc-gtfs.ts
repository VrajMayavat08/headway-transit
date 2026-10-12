import { createHash, randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import AdmZip from 'adm-zip'
import type { PoolClient } from 'pg'
import { createDatabasePool } from '../db/pool.js'
import { deleteFeedSnapshot } from './replaceSnapshot.js'

type CsvRow = Record<string, string>
type OpenCsv = { name: string; rows: Iterable<{ rowNumber: number; values: CsvRow }> }

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = resolve(scriptDirectory, '../../../../')
const archivePath = resolve(repositoryRoot, 'data/imports/ttc-static-gtfs.zip')
const sourceKey = 'ttc-static'
const batchSize = 500

function optional(value: string | undefined) { return value === '' || value === undefined ? null : value }

function required(row: CsvRow, file: string, rowNumber: number, column: string) {
  const value = row[column]
  if (!value) throw new Error(`${file}:${rowNumber} is missing required ${column}`)
  return value
}

function validateTime(value: string | undefined, file: string, rowNumber: number, column: string) {
  if (!value) return null
  const match = /^(\d{1,3}):([0-5]\d):([0-5]\d)$/.exec(value)
  if (!match) throw new Error(`${file}:${rowNumber} has invalid ${column} ${value}`)
  return value
}

function integer(value: string, file: string, rowNumber: number, column: string, minimum = 0) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < minimum) throw new Error(`${file}:${rowNumber} has invalid ${column} ${value}`)
  return parsed
}

function coordinate(value: string, file: string, rowNumber: number, column: string, minimum: number, maximum: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) throw new Error(`${file}:${rowNumber} has invalid ${column} ${value}`)
  return parsed
}

function date(value: string, file: string, rowNumber: number, column: string) {
  if (!/^\d{8}$/.test(value)) throw new Error(`${file}:${rowNumber} has invalid ${column} ${value}`)
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
}

function* csvRecords(text: string): Generator<string[]> {
  let row: string[] = []
  let value = ''
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { value += '"'; index += 1 } else quoted = !quoted
    } else if (character === ',' && !quoted) {
      row.push(value); value = ''
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1
      row.push(value)
      if (row.some((cell) => cell.length > 0)) yield row
      row = []; value = ''
    } else value += character
  }
  if (quoted) throw new Error('CSV contains an unterminated quoted field')
  row.push(value)
  if (row.some((cell) => cell.length > 0)) yield row
}

function openCsv(zip: AdmZip, name: string, requiredColumns: string[], optionalFile = false): OpenCsv | null {
  const entry = zip.getEntry(name)
  if (!entry) {
    if (optionalFile) return null
    throw new Error(`GTFS archive is missing required ${name}`)
  }
  const records = csvRecords(entry.getData().toString('utf8'))
  const headerRecord = records.next()
  if (headerRecord.done || !headerRecord.value) throw new Error(`${name} is empty`)
  const headers: string[] = headerRecord.value.map((header: string) => header.replace(/^\uFEFF/, ''))
  for (const column of requiredColumns) if (!headers.includes(column)) throw new Error(`${name} is missing required column ${column}`)
  return {
    name,
    rows: (function* () {
      let rowNumber = 1
      for (const values of records) {
        rowNumber += 1
        yield { rowNumber, values: Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])) }
      }
    })(),
  }
}

async function insertBatch(client: PoolClient, table: string, columns: string[], rows: unknown[][]) {
  if (rows.length === 0) return
  const values: unknown[] = []
  const placeholders = rows.map((row) => `(${row.map((_, columnIndex) => {
    values.push(row[columnIndex])
    const placeholder = `$${values.length}`
    return columns[columnIndex] === 'geometry' ? `ST_GeomFromText(${placeholder}, 4326)` : placeholder
  }).join(', ')})`).join(', ')
  await client.query(`INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders}`, values)
}

async function importFile(client: PoolClient, csv: OpenCsv | null, table: string, columns: string[], transform: (row: CsvRow, file: string, rowNumber: number) => unknown[], counts: Record<string, number>) {
  if (!csv) return
  const batch: unknown[][] = []
  for (const { rowNumber, values } of csv.rows) {
    batch.push(transform(values, csv.name, rowNumber))
    if (batch.length === batchSize) { await insertBatch(client, table, columns, batch); counts[table] = (counts[table] ?? 0) + batch.length; batch.length = 0 }
  }
  if (batch.length) { await insertBatch(client, table, columns, batch); counts[table] = (counts[table] ?? 0) + batch.length }
}

const pool = createDatabasePool()
if (!pool) throw new Error('DATABASE_URL is required to import GTFS')
const startedAt = Date.now()

try {
  const archive = await readFile(archivePath)
  const checksum = createHash('sha256').update(archive).digest('hex')
  const zip = new AdmZip(archive)
  const agenciesCsv = openCsv(zip, 'agency.txt', ['agency_name', 'agency_url', 'agency_timezone'])
  const routesCsv = openCsv(zip, 'routes.txt', ['route_id', 'route_type'])
  const stopsCsv = openCsv(zip, 'stops.txt', ['stop_id', 'stop_lat', 'stop_lon'])
  const tripsCsv = openCsv(zip, 'trips.txt', ['route_id', 'service_id', 'trip_id'])
  const stopTimesCsv = openCsv(zip, 'stop_times.txt', ['trip_id', 'stop_id', 'stop_sequence'])
  const shapesCsv = openCsv(zip, 'shapes.txt', ['shape_id', 'shape_pt_lat', 'shape_pt_lon', 'shape_pt_sequence'], true)
  const calendarCsv = openCsv(zip, 'calendar.txt', ['service_id', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'start_date', 'end_date'], true)
  const calendarDatesCsv = openCsv(zip, 'calendar_dates.txt', ['service_id', 'date', 'exception_type'], true)
  const feedImportId = randomUUID()
  const counts: Record<string, number> = {}
  const routeIds = new Set<string>()
  const stopIds = new Set<string>()
  const tripIds = new Set<string>()
  const stopTimeKeys = new Set<string>()
  const shapeKeys = new Set<string>()
  const agencyIds = new Set<string>()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    await deleteFeedSnapshot(client, sourceKey)
    await client.query('INSERT INTO feed_imports (feed_import_id, source_key, source_filename, source_checksum) VALUES ($1, $2, $3, $4)', [feedImportId, sourceKey, 'ttc-static-gtfs.zip', checksum])

    await importFile(client, agenciesCsv, 'agencies', ['feed_import_id', 'agency_id', 'agency_name', 'agency_url', 'agency_timezone', 'agency_lang', 'agency_phone', 'agency_fare_url', 'agency_email'], (row, file, rowNumber) => {
      const agencyId = row.agency_id || '__default__'
      if (agencyIds.has(agencyId)) throw new Error(`${file}:${rowNumber} has duplicate agency_id ${agencyId}`)
      agencyIds.add(agencyId)
      return [feedImportId, agencyId, required(row, file, rowNumber, 'agency_name'), required(row, file, rowNumber, 'agency_url'), required(row, file, rowNumber, 'agency_timezone'), optional(row.agency_lang), optional(row.agency_phone), optional(row.agency_fare_url), optional(row.agency_email)]
    }, counts)

    await importFile(client, routesCsv, 'routes', ['feed_import_id', 'route_id', 'agency_id', 'route_short_name', 'route_long_name', 'route_desc', 'route_type', 'route_url', 'route_color', 'route_text_color', 'route_sort_order', 'continuous_pickup', 'continuous_drop_off'], (row, file, rowNumber) => {
      const routeId = required(row, file, rowNumber, 'route_id')
      if (routeIds.has(routeId)) throw new Error(`${file}:${rowNumber} has duplicate route_id ${routeId}`)
      routeIds.add(routeId)
      return [feedImportId, routeId, optional(row.agency_id), optional(row.route_short_name), optional(row.route_long_name), optional(row.route_desc), required(row, file, rowNumber, 'route_type'), optional(row.route_url), optional(row.route_color), optional(row.route_text_color), optional(row.route_sort_order), optional(row.continuous_pickup), optional(row.continuous_drop_off)]
    }, counts)

    await importFile(client, stopsCsv, 'stops', ['feed_import_id', 'stop_id', 'stop_code', 'stop_name', 'stop_desc', 'stop_lat', 'stop_lon', 'zone_id', 'stop_url', 'location_type', 'parent_station', 'stop_timezone', 'wheelchair_boarding', 'level_id', 'platform_code', 'geometry'], (row, file, rowNumber) => {
      const stopId = required(row, file, rowNumber, 'stop_id')
      if (stopIds.has(stopId)) throw new Error(`${file}:${rowNumber} has duplicate stop_id ${stopId}`)
      stopIds.add(stopId)
      const lat = coordinate(required(row, file, rowNumber, 'stop_lat'), file, rowNumber, 'stop_lat', -90, 90)
      const lon = coordinate(required(row, file, rowNumber, 'stop_lon'), file, rowNumber, 'stop_lon', -180, 180)
      return [feedImportId, stopId, optional(row.stop_code), optional(row.stop_name), optional(row.stop_desc), lat, lon, optional(row.zone_id), optional(row.stop_url), optional(row.location_type), optional(row.parent_station), optional(row.stop_timezone), optional(row.wheelchair_boarding), optional(row.level_id), optional(row.platform_code), `POINT(${lon} ${lat})`]
    }, counts)

    await importFile(client, tripsCsv, 'trips', ['feed_import_id', 'route_id', 'service_id', 'trip_id', 'trip_headsign', 'trip_short_name', 'direction_id', 'block_id', 'shape_id', 'wheelchair_accessible', 'bikes_allowed'], (row, file, rowNumber) => {
      const routeId = required(row, file, rowNumber, 'route_id')
      if (!routeIds.has(routeId)) throw new Error(`${file}:${rowNumber} references nonexistent route_id ${routeId}`)
      const tripId = required(row, file, rowNumber, 'trip_id')
      if (tripIds.has(tripId)) throw new Error(`${file}:${rowNumber} has duplicate trip_id ${tripId}`)
      tripIds.add(tripId)
      return [feedImportId, routeId, required(row, file, rowNumber, 'service_id'), tripId, optional(row.trip_headsign), optional(row.trip_short_name), optional(row.direction_id), optional(row.block_id), optional(row.shape_id), optional(row.wheelchair_accessible), optional(row.bikes_allowed)]
    }, counts)

    await importFile(client, stopTimesCsv, 'stop_times', ['feed_import_id', 'trip_id', 'arrival_time', 'departure_time', 'stop_id', 'stop_sequence', 'stop_headsign', 'pickup_type', 'drop_off_type', 'continuous_pickup', 'continuous_drop_off', 'shape_dist_traveled', 'timepoint'], (row, file, rowNumber) => {
      const tripId = required(row, file, rowNumber, 'trip_id')
      if (!tripIds.has(tripId)) throw new Error(`${file}:${rowNumber} references nonexistent trip_id ${tripId}`)
      const stopId = required(row, file, rowNumber, 'stop_id')
      if (!stopIds.has(stopId)) throw new Error(`${file}:${rowNumber} references nonexistent stop_id ${stopId}`)
      const sequence = integer(required(row, file, rowNumber, 'stop_sequence'), file, rowNumber, 'stop_sequence', 0)
      const key = `${tripId}\u0000${sequence}`
      if (stopTimeKeys.has(key)) throw new Error(`${file}:${rowNumber} has duplicate trip_id and stop_sequence ${tripId}/${sequence}`)
      stopTimeKeys.add(key)
      return [feedImportId, tripId, validateTime(row.arrival_time, file, rowNumber, 'arrival_time'), validateTime(row.departure_time, file, rowNumber, 'departure_time'), stopId, sequence, optional(row.stop_headsign), optional(row.pickup_type), optional(row.drop_off_type), optional(row.continuous_pickup), optional(row.continuous_drop_off), optional(row.shape_dist_traveled), optional(row.timepoint)]
    }, counts)

    await importFile(client, shapesCsv, 'shapes', ['feed_import_id', 'shape_id', 'shape_pt_sequence', 'shape_pt_lat', 'shape_pt_lon', 'shape_dist_traveled', 'geometry'], (row, file, rowNumber) => {
      const shapeId = required(row, file, rowNumber, 'shape_id')
      const sequence = integer(required(row, file, rowNumber, 'shape_pt_sequence'), file, rowNumber, 'shape_pt_sequence', 0)
      const key = `${shapeId}\u0000${sequence}`
      if (shapeKeys.has(key)) throw new Error(`${file}:${rowNumber} has duplicate shape_id and shape_pt_sequence ${shapeId}/${sequence}`)
      shapeKeys.add(key)
      const lat = coordinate(required(row, file, rowNumber, 'shape_pt_lat'), file, rowNumber, 'shape_pt_lat', -90, 90)
      const lon = coordinate(required(row, file, rowNumber, 'shape_pt_lon'), file, rowNumber, 'shape_pt_lon', -180, 180)
      return [feedImportId, shapeId, sequence, lat, lon, optional(row.shape_dist_traveled), `POINT(${lon} ${lat})`]
    }, counts)

    await importFile(client, calendarCsv, 'calendar', ['feed_import_id', 'service_id', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'start_date', 'end_date'], (row, file, rowNumber) => [feedImportId, required(row, file, rowNumber, 'service_id'), required(row, file, rowNumber, 'monday'), required(row, file, rowNumber, 'tuesday'), required(row, file, rowNumber, 'wednesday'), required(row, file, rowNumber, 'thursday'), required(row, file, rowNumber, 'friday'), required(row, file, rowNumber, 'saturday'), required(row, file, rowNumber, 'sunday'), date(required(row, file, rowNumber, 'start_date'), file, rowNumber, 'start_date'), date(required(row, file, rowNumber, 'end_date'), file, rowNumber, 'end_date')], counts)
    await importFile(client, calendarDatesCsv, 'calendar_dates', ['feed_import_id', 'service_id', 'date', 'exception_type'], (row, file, rowNumber) => [feedImportId, required(row, file, rowNumber, 'service_id'), date(required(row, file, rowNumber, 'date'), file, rowNumber, 'date'), required(row, file, rowNumber, 'exception_type')], counts)

    await client.query('UPDATE feed_imports SET completed_at = now(), row_counts = $2::jsonb WHERE feed_import_id = $1', [feedImportId, JSON.stringify(counts)])
    await client.query('COMMIT')
    console.log(`Imported TTC static GTFS in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`)
    console.log(Object.entries(counts).map(([table, count]) => `${table}: ${count}`).join('\n'))
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
} finally {
  await pool.end()
}
