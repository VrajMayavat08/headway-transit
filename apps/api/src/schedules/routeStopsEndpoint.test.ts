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

test('GET /api/routes/:routeId/stops returns complete representative patterns by direction', async () => {
  const { database, queries } = createDatabase([
    {
      directionId: '0', tripId: 'trip-eastbound', headsign: 'Eastbound', tripCount: 8,
      stopId: '100', stopName: 'First stop', latitude: 43.65, longitude: -79.4, sequence: 1,
    },
    {
      directionId: '0', tripId: 'trip-eastbound', headsign: 'Eastbound', tripCount: 8,
      stopId: '101', stopName: 'Second stop', latitude: 43.66, longitude: -79.39, sequence: 2,
    },
    {
      directionId: '1', tripId: 'trip-westbound', headsign: 'Westbound', tripCount: 6,
      stopId: '102', stopName: 'Third stop', latitude: 43.66, longitude: -79.38, sequence: 1,
    },
  ])
  const app = buildApp({ database })

  const response = await app.inject({ method: 'GET', url: '/api/routes/29/stops' })

  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), {
    routeId: '29',
    patterns: [
      {
        directionId: '0', tripId: 'trip-eastbound', headsign: 'Eastbound', tripCount: 8,
        stops: [
          { stopId: '100', stopName: 'First stop', latitude: 43.65, longitude: -79.4, sequence: 1 },
          { stopId: '101', stopName: 'Second stop', latitude: 43.66, longitude: -79.39, sequence: 2 },
        ],
      },
      {
        directionId: '1', tripId: 'trip-westbound', headsign: 'Westbound', tripCount: 6,
        stops: [{ stopId: '102', stopName: 'Third stop', latitude: 43.66, longitude: -79.38, sequence: 1 }],
      },
    ],
  })
  assert.deepEqual(queries[0]?.values, ['ttc-static', '29'])
  assert.match(queries[0]?.text ?? '', /array_agg\(st.stop_id ORDER BY st.stop_sequence\)/)
  assert.match(queries[0]?.text ?? '', /PARTITION BY tp.direction_key/)

  await app.close()
})

test('GET /api/routes/:routeId/stops returns no patterns when the route has no stop data', async () => {
  const { database } = createDatabase([])
  const app = buildApp({ database })

  const response = await app.inject({ method: 'GET', url: '/api/routes/no-stops/stops' })

  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), { routeId: 'no-stops', patterns: [] })

  await app.close()
})
