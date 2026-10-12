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

test('GET /api/routes/:routeId/geometry returns distinct ordered shape features', async () => {
  const { database, queries } = createDatabase([
    {
      routeId: '29', directionId: '0', shapeId: 'shape-east', tripId: 'trip-east', tripCount: 12,
      longitude: -79.4, latitude: 43.65,
    },
    {
      routeId: '29', directionId: '0', shapeId: 'shape-east', tripId: 'trip-east', tripCount: 12,
      longitude: -79.39, latitude: 43.66,
    },
    {
      routeId: '29', directionId: '1', shapeId: 'shape-west-branch', tripId: 'trip-west', tripCount: 4,
      longitude: -79.38, latitude: 43.66,
    },
    {
      routeId: '29', directionId: '1', shapeId: 'shape-west-branch', tripId: 'trip-west', tripCount: 4,
      longitude: -79.37, latitude: 43.67,
    },
  ])
  const app = buildApp({ database })

  const response = await app.inject({ method: 'GET', url: '/api/routes/29/geometry' })

  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { routeId: '29', directionId: '0', shapeId: 'shape-east', tripId: 'trip-east', tripCount: 12 },
        geometry: { type: 'LineString', coordinates: [[-79.4, 43.65], [-79.39, 43.66]] },
      },
      {
        type: 'Feature',
        properties: { routeId: '29', directionId: '1', shapeId: 'shape-west-branch', tripId: 'trip-west', tripCount: 4 },
        geometry: { type: 'LineString', coordinates: [[-79.38, 43.66], [-79.37, 43.67]] },
      },
    ],
  })
  assert.deepEqual(queries[0]?.values, ['ttc-static', '29'])
  assert.match(queries[0]?.text ?? '', /GROUP BY t.route_id, t.direction_id, t.shape_id/)
  assert.match(queries[0]?.text ?? '', /ORDER BY rs.direction_key, rs.shape_id, s.shape_pt_sequence/)

  await app.close()
})

test('GET /api/routes/:routeId/geometry returns an empty GeoJSON collection without shapes', async () => {
  const { database } = createDatabase([])
  const app = buildApp({ database })

  const response = await app.inject({ method: 'GET', url: '/api/routes/no-shapes/geometry' })

  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), { type: 'FeatureCollection', features: [] })

  await app.close()
})
