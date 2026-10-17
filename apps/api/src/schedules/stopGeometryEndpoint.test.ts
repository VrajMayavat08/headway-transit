import assert from 'node:assert/strict'
import test from 'node:test'
import type { Pool } from 'pg'
import { buildApp } from '../app.js'

function createDatabase(rows: unknown[]) {
  const queries: Array<{ text: string; values?: unknown[] }> = []
  const database = {
    query: async (text: string, values?: unknown[]) => {
      queries.push({ text, values })
      return { rows }
    },
    end: async () => undefined,
  } as unknown as Pool

  return { database, queries }
}

test('GET /api/stops/:stopId/geometry returns only representative shapes from trips serving that stop', async () => {
  const { database, queries } = createDatabase([
    { routeId: '52', routeShortName: '52', routeLongName: 'Lawrence West', directionId: '0', headsign: 'Lawrence Station', shapeId: 'shape-52-east', tripId: 'trip-serving-6202', tripCount: 211, longitude: -79.541, latitude: 43.689 },
    { routeId: '52', routeShortName: '52', routeLongName: 'Lawrence West', directionId: '0', headsign: 'Lawrence Station', shapeId: 'shape-52-east', tripId: 'trip-serving-6202', tripCount: 211, longitude: -79.54, latitude: 43.69 },
    { routeId: '52', routeShortName: '52', routeLongName: 'Lawrence West', directionId: '1', headsign: 'Royal York Station', shapeId: 'shape-52-west', tripId: 'trip-returning-6202', tripCount: 201, longitude: -79.54, latitude: 43.69 },
    { routeId: '52', routeShortName: '52', routeLongName: 'Lawrence West', directionId: '1', headsign: 'Royal York Station', shapeId: 'shape-52-west', tripId: 'trip-returning-6202', tripCount: 201, longitude: -79.541, latitude: 43.689 },
  ])
  const app = buildApp({ database })

  const response = await app.inject({ method: 'GET', url: '/api/stops/6202/geometry' })

  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { routeId: '52', routeShortName: '52', routeLongName: 'Lawrence West', directionId: '0', headsign: 'Lawrence Station', shapeId: 'shape-52-east', tripId: 'trip-serving-6202', tripCount: 211 },
        geometry: { type: 'LineString', coordinates: [[-79.541, 43.689], [-79.54, 43.69]] },
      },
      {
        type: 'Feature',
        properties: { routeId: '52', routeShortName: '52', routeLongName: 'Lawrence West', directionId: '1', headsign: 'Royal York Station', shapeId: 'shape-52-west', tripId: 'trip-returning-6202', tripCount: 201 },
        geometry: { type: 'LineString', coordinates: [[-79.54, 43.69], [-79.541, 43.689]] },
      },
    ],
  })
  assert.deepEqual(queries[0]?.values, ['ttc-static', '6202'])
  assert.match(queries[0]?.text ?? '', /JOIN stop_times st/)
  assert.match(queries[0]?.text ?? '', /PARTITION BY route_id, direction_key/)
  assert.match(queries[0]?.text ?? '', /WHERE rs.shape_rank = 1/)

  await app.close()
})

test('GET /api/stops/:stopId/geometry returns no geometry when no serving trip has a shape', async () => {
  const { database } = createDatabase([])
  const app = buildApp({ database })

  const response = await app.inject({ method: 'GET', url: '/api/stops/no-shape/geometry' })

  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), { type: 'FeatureCollection', features: [] })
  await app.close()
})
