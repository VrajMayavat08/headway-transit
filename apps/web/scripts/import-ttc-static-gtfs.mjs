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

for (const point of shapes) {
  if (!candidateShapeIds.has(point.shape_id)) continue
  const longitude = Number(point.shape_pt_lon)
  const latitude = Number(point.shape_pt_lat)
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) continue
  const points = shapePoints.get(point.shape_id) ?? []
  points.push({ sequence: Number(point.shape_pt_sequence), coordinates: [longitude, latitude] })
  shapePoints.set(point.shape_id, points)
}

const representativeTripsByRouteId = new Map()
const features = selectedRoutes.map((route) => {
  const color = routeColor(route.route_color)
  if (!color) throw new Error(`Route ${route.route_short_name} has no usable GTFS route_color`)

  const representativeTrip = candidateTrips
    .filter((trip) => trip.route_id === route.route_id)
    .sort((a, b) => (shapePoints.get(b.shape_id)?.length ?? 0) - (shapePoints.get(a.shape_id)?.length ?? 0))[0]

  if (!representativeTrip) throw new Error(`Route ${route.route_short_name} has no trip with a shape_id`)
  representativeTripsByRouteId.set(route.route_id, representativeTrip)
  const points = shapePoints.get(representativeTrip.shape_id)?.sort((a, b) => a.sequence - b.sequence) ?? []
  if (points.length < 2) throw new Error(`Route ${route.route_short_name} has an incomplete representative shape`)

  const properties = {
    routeId: route.route_id,
    routeShortName: route.route_short_name,
    routeLongName: route.route_long_name,
    officialRouteColor: color,
    routeType: Number(route.route_type),
  }
  const coordinates = points.map((point) => point.coordinates)

  return [
    {
    type: 'Feature',
    properties,
    geometry: {
      type: 'LineString',
      coordinates,
    },
    },
    {
      type: 'Feature',
      properties,
      geometry: { type: 'Point', coordinates: coordinates[Math.floor(coordinates.length / 2)] },
    },
  ]
}).flat()

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify({ type: 'FeatureCollection', features }, null, 2)}\n`)
const routeById = new Map(selectedRoutes.map((route) => [route.route_id, route]))
const tripRouteIds = new Map(selectedTrips.map((trip) => [trip.trip_id, trip.route_id]))
const routesByStopId = new Map()
const stopTimesByTripId = new Map()

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

const stopsById = new Map(stops.map((stop) => [stop.stop_id, stop]))
const routeProfiles = selectedRoutes.map((route) => {
  const representativeTrip = representativeTripsByRouteId.get(route.route_id)
  const stopSequence = (stopTimesByTripId.get(representativeTrip.trip_id) ?? [])
    .sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence))
    .flatMap((stopTime) => {
      const stop = stopsById.get(stopTime.stop_id)
      return stop ? [{ stopId: stop.stop_id, stopName: stop.stop_name }] : []
    })
  const stopCount = [...routesByStopId.values()].filter((routeIds) => routeIds.has(route.route_id)).length

  return {
    routeId: route.route_id,
    routeShortName: route.route_short_name,
    routeLongName: route.route_long_name,
    routeType: Number(route.route_type),
    officialRouteColor: routeColor(route.route_color),
    representativeTripId: representativeTrip.trip_id,
    headsign: representativeTrip.trip_headsign || null,
    directionId: representativeTrip.direction_id || null,
    stopCount,
    firstStop: stopSequence[0] ?? null,
    lastStop: stopSequence.at(-1) ?? null,
    stopSequence,
  }
})

await writeFile(stopsOutputPath, `${JSON.stringify({ type: 'FeatureCollection', features: stopFeatures }, null, 2)}\n`)
await writeFile(profilesOutputPath, `${JSON.stringify(routeProfiles, null, 2)}\n`)
console.log(`Generated ${selectedRoutes.length} TTC surface routes (${features.length} GeoJSON features) at ${outputPath}`)
console.log(`Generated ${stopFeatures.length} TTC stops at ${stopsOutputPath}`)
console.log(`Generated ${routeProfiles.length} TTC route profiles at ${profilesOutputPath}`)
console.log(selectedRoutes.map((route) => `${route.route_short_name} ${route.route_long_name}`).join('\n'))
