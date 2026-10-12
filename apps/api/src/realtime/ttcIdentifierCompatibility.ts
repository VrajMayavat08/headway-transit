import { readFile } from 'node:fs/promises'
import AdmZip from 'adm-zip'
import { fetchTtcVehiclePositions, type RealtimeFetch, type TtcVehiclePosition } from './ttcVehiclePositions.js'

export const TTC_SURFACE_GTFS_URL = 'https://ckan0.cf.opendata.inter.prod-toronto.ca/dataset/bd4809dd-e289-4de8-bbde-c5c00dafbf4f/resource/28514055-d011-4ed7-8bb0-97961dfe2b66/download/SurfaceGTFS.zip'

type IdentifierKind = 'route' | 'trip'

export type GtfsIdentifierSets = {
  routeIds: Set<string>
  tripIds: Set<string>
  stopIds: Set<string>
}

export type IdentifierMatch = {
  liveIdentifierCount: number
  matchedIdentifierCount: number
  matchPercent: number | null
}

export type IdentifierCompatibilityReport = {
  fetchedAt: string
  vehicleCount: number
  vehiclesWithRouteId: number
  vehiclesWithTripId: number
  vehiclesWithStopId: number
  live: {
    routeIds: Set<string>
    tripIds: Set<string>
    stopIds: Set<string>
  }
  surfaceGtfs: {
    archivePath: string
    routeIds: number
    tripIds: number
    stopIds: number
    routeMatch: IdentifierMatch
    tripMatch: IdentifierMatch
    stopMatch: IdentifierMatch
  }
  existingStaticGtfs: {
    archivePath: string
    routeIds: number
    tripIds: number
    stopIds: number
    routeMatch: IdentifierMatch
    tripMatch: IdentifierMatch
    stopMatch: IdentifierMatch
  }
}

function* csvRecords(text: string): Generator<string[]> {
  let row: string[] = []
  let value = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"'
        index += 1
      } else quoted = !quoted
    } else if (character === ',' && !quoted) {
      row.push(value)
      value = ''
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1
      row.push(value)
      if (row.some((cell) => cell.length > 0)) yield row
      row = []
      value = ''
    } else value += character
  }

  if (quoted) throw new Error('CSV contains an unterminated quoted field')
  row.push(value)
  if (row.some((cell) => cell.length > 0)) yield row
}

function idsFromCsv(zip: AdmZip, filename: string, column: string) {
  const entry = zip.getEntry(filename)
  if (!entry) throw new Error(`GTFS archive is missing required ${filename}`)
  const records = csvRecords(entry.getData().toString('utf8'))
  const header = records.next().value
  if (!header) throw new Error(`GTFS archive has an empty ${filename}`)
  const index = header.indexOf(column)
  if (index < 0) throw new Error(`${filename} is missing required ${column}`)

  const identifiers = new Set<string>()
  for (const row of records) {
    const identifier = row[index]?.trim()
    if (identifier) identifiers.add(identifier)
  }
  return identifiers
}

export async function readGtfsIdentifierSets(archivePath: string): Promise<GtfsIdentifierSets> {
  const archive = new AdmZip(await readFile(archivePath))
  return {
    routeIds: idsFromCsv(archive, 'routes.txt', 'route_id'),
    tripIds: idsFromCsv(archive, 'trips.txt', 'trip_id'),
    stopIds: idsFromCsv(archive, 'stops.txt', 'stop_id'),
  }
}

function liveIdentifiers(vehicles: TtcVehiclePosition[], kind: IdentifierKind | 'stop') {
  const field = kind === 'route' ? 'routeId' : kind === 'trip' ? 'tripId' : 'stopId'
  return new Set(vehicles.flatMap((vehicle) => vehicle[field] ? [vehicle[field]] : []))
}

export function matchLiveIdentifiers(live: Set<string>, archive: Set<string>): IdentifierMatch {
  const matchedIdentifierCount = [...live].filter((identifier) => archive.has(identifier)).length
  return {
    liveIdentifierCount: live.size,
    matchedIdentifierCount,
    matchPercent: live.size === 0 ? null : Number(((matchedIdentifierCount / live.size) * 100).toFixed(2)),
  }
}

export async function checkTtcIdentifierCompatibility({
  surfaceArchivePath,
  existingStaticArchivePath,
  fetcher,
}: {
  surfaceArchivePath: string
  existingStaticArchivePath: string
  fetcher?: RealtimeFetch
}): Promise<IdentifierCompatibilityReport> {
  const [surfaceGtfs, existingStaticGtfs, snapshot] = await Promise.all([
    readGtfsIdentifierSets(surfaceArchivePath),
    readGtfsIdentifierSets(existingStaticArchivePath),
    fetchTtcVehiclePositions(fetcher),
  ])
  const routeIds = liveIdentifiers(snapshot.vehicles, 'route')
  const tripIds = liveIdentifiers(snapshot.vehicles, 'trip')
  const stopIds = liveIdentifiers(snapshot.vehicles, 'stop')

  return {
    fetchedAt: snapshot.fetchedAt,
    vehicleCount: snapshot.vehicles.length,
    vehiclesWithRouteId: snapshot.vehicles.filter((vehicle) => vehicle.routeId).length,
    vehiclesWithTripId: snapshot.vehicles.filter((vehicle) => vehicle.tripId).length,
    vehiclesWithStopId: snapshot.vehicles.filter((vehicle) => vehicle.stopId).length,
    live: { routeIds, tripIds, stopIds },
    surfaceGtfs: {
      archivePath: surfaceArchivePath,
      routeIds: surfaceGtfs.routeIds.size,
      tripIds: surfaceGtfs.tripIds.size,
      stopIds: surfaceGtfs.stopIds.size,
      routeMatch: matchLiveIdentifiers(routeIds, surfaceGtfs.routeIds),
      tripMatch: matchLiveIdentifiers(tripIds, surfaceGtfs.tripIds),
      stopMatch: matchLiveIdentifiers(stopIds, surfaceGtfs.stopIds),
    },
    existingStaticGtfs: {
      archivePath: existingStaticArchivePath,
      routeIds: existingStaticGtfs.routeIds.size,
      tripIds: existingStaticGtfs.tripIds.size,
      stopIds: existingStaticGtfs.stopIds.size,
      routeMatch: matchLiveIdentifiers(routeIds, existingStaticGtfs.routeIds),
      tripMatch: matchLiveIdentifiers(tripIds, existingStaticGtfs.tripIds),
      stopMatch: matchLiveIdentifiers(stopIds, existingStaticGtfs.stopIds),
    },
  }
}
