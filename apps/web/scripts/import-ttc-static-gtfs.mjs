import AdmZip from 'adm-zip'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = resolve(scriptDirectory, '../../..')
const sourceUrl = 'https://ckan0.cf.opendata.inter.prod-toronto.ca/dataset/7795b45e-e65a-4465-81fc-c36b9dfff169/resource/cfb6b2b8-6191-41e3-bda1-b175c51148cb/download/opendata_ttc_schedules.zip'
const rawArchivePath = resolve(repositoryRoot, 'data/imports/ttc-static-gtfs.zip')
const outputPath = resolve(repositoryRoot, 'apps/web/src/features/network/data/generated/ttc-surface-routes.json')
const stopsOutputPath = resolve(repositoryRoot, 'apps/web/src/features/network/data/generated/ttc-surface-stops.json')
const patternStopsOutputPath = resolve(repositoryRoot, 'apps/web/src/features/network/data/generated/ttc-surface-pattern-stops.json')
const profilesOutputPath = resolve(repositoryRoot, 'apps/web/src/features/network/data/generated/ttc-surface-route-profiles.json')
const selectedRouteShortNames = ['29', '35', '52', '54', '63', '75', '97', '501', '504']
const surfaceRouteTypes = new Set(['0', '3'])

function parseCsv(text) {
  const rows = []
  let row = []
  let value = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (character === ',' && !quoted) {
      row.push(value)
      value = ''
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1
      row.push(value)
      if (row.some((cell) => cell.length > 0)) rows.push(row)
      row = []
      value = ''
    } else {
      value += character
    }
  }

  row.push(value)
  if (row.some((cell) => cell.length > 0)) rows.push(row)

  const [headers, ...records] = rows
  return records.map((record) => Object.fromEntries(headers.map((header, index) => [header.replace(/^\uFEFF/, ''), record[index] ?? ''])))
}

async function downloadArchive() {
  await mkdir(dirname(rawArchivePath), { recursive: true })
  console.log('Downloading official TTC static GTFS archive…')
  const response = await fetch(sourceUrl)
  if (!response.ok) throw new Error(`GTFS download failed: ${response.status} ${response.statusText}`)
  await writeFile(rawArchivePath, Buffer.from(await response.arrayBuffer()))
}

async function loadArchive() {
  try {
    return await readFile(rawArchivePath)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    await downloadArchive()
    return readFile(rawArchivePath)
  }
}

function readGtfsFile(zip, name) {
  const entry = zip.getEntry(name)
  if (!entry) throw new Error(`GTFS archive is missing ${name}`)
  return parseCsv(entry.getData().toString('utf8'))
}

function routeColor(value) {
  const normalized = value.replace(/^#/, '')
  return /^[0-9a-f]{6}$/i.test(normalized) ? `#${normalized}` : undefined
}

const archive = await loadArchive()
const zip = new AdmZip(archive)
const routes = readGtfsFile(zip, 'routes.txt')
const trips = readGtfsFile(zip, 'trips.txt')
const shapes = readGtfsFile(zip, 'shapes.txt')
const stops = readGtfsFile(zip, 'stops.txt')
const stopTimes = readGtfsFile(zip, 'stop_times.txt')

const selectedRoutes = selectedRouteShortNames
  .map((shortName) => routes.find((route) => route.route_short_name === shortName && surfaceRouteTypes.has(route.route_type)))
  .filter(Boolean)

if (selectedRoutes.length !== selectedRouteShortNames.length) {
  const foundNames = new Set(selectedRoutes.map((route) => route.route_short_name))
  const missing = selectedRouteShortNames.filter((shortName) => !foundNames.has(shortName))
  throw new Error(`Selected surface routes were not found in routes.txt: ${missing.join(', ')}`)
}

const selectedRouteIds = new Set(selectedRoutes.map((route) => route.route_id))
const selectedTrips = trips.filter((trip) => selectedRouteIds.has(trip.route_id))
const selectedTripIds = new Set(selectedTrips.map((trip) => trip.trip_id))
const candidateTrips = selectedTrips.filter((trip) => trip.shape_id)
const candidateShapeIds = new Set(candidateTrips.map((trip) => trip.shape_id))
const shapePoints = new Map()
const routeById = new Map(selectedRoutes.map((route) => [route.route_id, route]))
const tripRouteIds = new Map(selectedTrips.map((trip) => [trip.trip_id, trip.route_id]))
const stopsById = new Map(stops.map((stop) => [stop.stop_id, stop]))
const stopTimesByTripId = new Map()
const routesByStopId = new Map()
const orderedStopsByTripId = new Map()

for (const point of shapes) {
  if (!candidateShapeIds.has(point.shape_id)) continue
  const longitude = Number(point.shape_pt_lon)
  const latitude = Number(point.shape_pt_lat)
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) continue
  const points = shapePoints.get(point.shape_id) ?? []
  points.push({ sequence: Number(point.shape_pt_sequence), coordinates: [longitude, latitude] })
  shapePoints.set(point.shape_id, points)
}

for (const stopTime of stopTimes) {
  if (selectedTripIds.has(stopTime.trip_id)) {
    const tripStopTimes = stopTimesByTripId.get(stopTime.trip_id) ?? []
    tripStopTimes.push(stopTime)
    stopTimesByTripId.set(stopTime.trip_id, tripStopTimes)
  }
  const routeId = tripRouteIds.get(stopTime.trip_id)
  if (!routeId) continue
  const routeIds = routesByStopId.get(stopTime.stop_id) ?? new Set()
  routeIds.add(routeId)
  routesByStopId.set(stopTime.stop_id, routeIds)
}

function orderedStops(trip) {
  const cached = orderedStopsByTripId.get(trip.trip_id)
  if (cached) return cached
  const sequence = (stopTimesByTripId.get(trip.trip_id) ?? [])
    .sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence))
    .flatMap((stopTime) => {
      const stop = stopsById.get(stopTime.stop_id)
      return stop ? [{ stopId: stop.stop_id, stopName: stop.stop_name }] : []
    })
  orderedStopsByTripId.set(trip.trip_id, sequence)
  return sequence
}

function routePatternCandidates(route) {
  const byPatternIdentity = new Map()
  for (const trip of candidateTrips) {
    if (trip.route_id !== route.route_id) continue
    const points = shapePoints.get(trip.shape_id)?.sort((a, b) => a.sequence - b.sequence) ?? []
    if (points.length < 2) continue
    const stopIds = orderedStops(trip).map((stop) => stop.stopId).join(',')
    const identity = [trip.shape_id, trip.direction_id || '', trip.trip_headsign || '', stopIds].join('|')
    const tripsForPattern = byPatternIdentity.get(identity) ?? []
    tripsForPattern.push(trip)
    byPatternIdentity.set(identity, tripsForPattern)
  }

  const patterns = [...byPatternIdentity].map(([, tripsForPattern]) => {
    const representativeTrip = [...tripsForPattern].sort((a, b) => a.trip_id.localeCompare(b.trip_id))[0]
    const shapeId = representativeTrip.shape_id
    const coordinates = (shapePoints.get(shapeId) ?? [])
      .sort((a, b) => a.sequence - b.sequence)
      .map((point) => point.coordinates)
    return {
      patternId: `${route.route_id}:${shapeId}`,
      shapeId,
      representativeTrip,
      tripCount: tripsForPattern.length,
      coordinates,
      stopSequence: orderedStops(representativeTrip),
    }
  })

  const longestPatternByShapeId = new Map()
  for (const pattern of patterns) {
    const current = longestPatternByShapeId.get(pattern.shapeId)
    if (!current || pattern.stopSequence.length > current.stopSequence.length
      || (pattern.stopSequence.length === current.stopSequence.length && pattern.tripCount > current.tripCount)) {
      longestPatternByShapeId.set(pattern.shapeId, pattern)
    }
  }

  return [...longestPatternByShapeId.values()]
    .sort((a, b) => b.stopSequence.length - a.stopSequence.length || b.tripCount - a.tripCount || a.shapeId.localeCompare(b.shapeId))
}

function selectPatterns(patterns, routeShortName) {
  const selected = []
  const add = (pattern) => {
    if (pattern && !selected.some((candidate) => candidate.shapeId === pattern.shapeId) && selected.length < 5) selected.push(pattern)
  }
  const baseRouteExpression = new RegExp(`\\b${routeShortName}\\b`)
  add(patterns.find((pattern) => baseRouteExpression.test(pattern.representativeTrip.trip_headsign || '')) ?? patterns[0])

  const representedDirections = new Set(selected.map((pattern) => pattern.representativeTrip.direction_id || ''))
  for (const pattern of patterns) {
    const direction = pattern.representativeTrip.direction_id || ''
    if (!representedDirections.has(direction)) {
      add(pattern)
      representedDirections.add(direction)
    }
  }

  const representedHeadsigns = new Set(selected.map((pattern) => pattern.representativeTrip.trip_headsign || ''))
  for (const pattern of patterns) {
    const headsign = pattern.representativeTrip.trip_headsign || ''
    if (!representedHeadsigns.has(headsign)) {
      add(pattern)
      representedHeadsigns.add(headsign)
    }
  }

  for (const pattern of patterns) add(pattern)
  return selected
}

const selectedPatternsByRouteId = new Map()
const allPatternCountsByRouteId = new Map()
const features = selectedRoutes.flatMap((route) => {
  const color = routeColor(route.route_color)
  if (!color) throw new Error(`Route ${route.route_short_name} has no usable GTFS route_color`)

  const candidates = routePatternCandidates(route)
  if (!candidates.length) throw new Error(`Route ${route.route_short_name} has no complete shape patterns`)
  const selectedPatterns = selectPatterns(candidates, route.route_short_name)
  selectedPatternsByRouteId.set(route.route_id, selectedPatterns)
  allPatternCountsByRouteId.set(route.route_id, candidates.length)

  return selectedPatterns.flatMap((pattern, index) => {
    const properties = {
      routeId: route.route_id,
      routeShortName: route.route_short_name,
      routeLongName: route.route_long_name,
      officialRouteColor: color,
      routeType: Number(route.route_type),
      patternId: pattern.patternId,
      shapeId: pattern.shapeId,
      representativeTripId: pattern.representativeTrip.trip_id,
      tripCount: pattern.tripCount,
      directionId: pattern.representativeTrip.direction_id || null,
      headsign: pattern.representativeTrip.trip_headsign || null,
      isPrimary: index === 0,
    }
    const line = { type: 'Feature', properties, geometry: { type: 'LineString', coordinates: pattern.coordinates } }
    if (index !== 0) return [line]
    return [line, { type: 'Feature', properties, geometry: { type: 'Point', coordinates: pattern.coordinates[Math.floor(pattern.coordinates.length / 2)] } }]
  })
})

const patternStopFeaturesByKey = new Map()
for (const route of selectedRoutes) {
  for (const pattern of selectedPatternsByRouteId.get(route.route_id) ?? []) {
    for (const sequenceStop of pattern.stopSequence) {
      const stop = stopsById.get(sequenceStop.stopId)
      const latitude = Number(stop?.stop_lat)
      const longitude = Number(stop?.stop_lon)
      if (!stop || stop.location_type === '1' || !Number.isFinite(latitude) || !Number.isFinite(longitude)) continue
      const key = `${route.route_id}:${stop.stop_id}`
      const feature = patternStopFeaturesByKey.get(key) ?? {
        type: 'Feature',
        properties: {
          routeId: route.route_id,
          stopId: stop.stop_id,
          stopName: stop.stop_name,
          stopLat: latitude,
          stopLon: longitude,
          patternIds: [],
        },
        geometry: { type: 'Point', coordinates: [longitude, latitude] },
      }
      feature.properties.patternIds.push(pattern.patternId)
      patternStopFeaturesByKey.set(key, feature)
    }
  }
}

const stopFeatures = stops.flatMap((stop) => {
  const routeIds = routesByStopId.get(stop.stop_id)
  const latitude = Number(stop.stop_lat)
  const longitude = Number(stop.stop_lon)
  if (!routeIds || stop.location_type === '1' || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return []

  const routeIdList = [...routeIds]
  return [{
    type: 'Feature',
    properties: {
      stopId: stop.stop_id,
      stopName: stop.stop_name,
      stopLat: latitude,
      stopLon: longitude,
      routeIds: routeIdList,
      routeShortNames: routeIdList.map((routeId) => routeById.get(routeId).route_short_name),
    },
    geometry: { type: 'Point', coordinates: [longitude, latitude] },
  }]
})

const routeProfiles = selectedRoutes.map((route) => {
  const [primaryPattern] = selectedPatternsByRouteId.get(route.route_id) ?? []
  if (!primaryPattern) throw new Error(`Route ${route.route_short_name} has no selected primary pattern`)
  const stopSequence = primaryPattern.stopSequence
  const shownPatternCount = selectedPatternsByRouteId.get(route.route_id).length
  const omittedPatternCount = (allPatternCountsByRouteId.get(route.route_id) ?? shownPatternCount) - shownPatternCount

  return {
    routeId: route.route_id,
    routeShortName: route.route_short_name,
    routeLongName: route.route_long_name,
    routeType: Number(route.route_type),
    officialRouteColor: routeColor(route.route_color),
    representativeTripId: primaryPattern.representativeTrip.trip_id,
    headsign: primaryPattern.representativeTrip.trip_headsign || null,
    directionId: primaryPattern.representativeTrip.direction_id || null,
    stopCount: stopSequence.length,
    shownPatternCount,
    omittedPatternCount,
    firstStop: stopSequence[0] ?? null,
    lastStop: stopSequence.at(-1) ?? null,
    stopSequence,
  }
})

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify({ type: 'FeatureCollection', features }, null, 2)}\n`)
await writeFile(stopsOutputPath, `${JSON.stringify({ type: 'FeatureCollection', features: stopFeatures }, null, 2)}\n`)
await writeFile(patternStopsOutputPath, `${JSON.stringify({ type: 'FeatureCollection', features: [...patternStopFeaturesByKey.values()] }, null, 2)}\n`)
await writeFile(profilesOutputPath, `${JSON.stringify(routeProfiles, null, 2)}\n`)
console.log(`Generated ${selectedRoutes.length} TTC surface route patterns (${features.length} GeoJSON features) at ${outputPath}`)
console.log(`Generated ${stopFeatures.length} TTC stops at ${stopsOutputPath}`)
console.log(`Generated ${patternStopFeaturesByKey.size} pattern-associated TTC stops at ${patternStopsOutputPath}`)
console.log(`Generated ${routeProfiles.length} TTC route profiles at ${profilesOutputPath}`)
console.log(selectedRoutes.map((route) => `${route.route_short_name} ${route.route_long_name}`).join('\n'))
