import assert from 'node:assert/strict'
import test from 'node:test'
import type { Pool } from 'pg'
import { buildApp } from '../app.js'

test('GET /api/realtime/vehicles returns the latest stored snapshot and preserves unmatched identifiers', async () => {
  const queries: Array<{ text: string; values?: unknown[] }> = []
  const database = {
    query: async (text: string, values?: unknown[]) => {
      queries.push({ text, values })
      if (text.includes('FROM vehicle_position_snapshots')) return { rows: [{ snapshotId: 'snapshot-1', fetchedAt: new Date(), feedTimestamp: '1790000000', vehicleCount: 1 }] }
      return { rows: [{
        entityId: 'entity-1', vehicleId: 'bus-1', sourceTimestamp: '1790000001', reportedRouteId: '29', reportedTripId: 'unmatched-trip', reportedStopId: null,
        matchedSurfaceRouteId: '29', matchedSurfaceTripId: null, matchedSurfaceStopId: null, latitude: 43.65, longitude: -79.4,
        directionId: 0, currentStopSequence: 4, bearing: null, speedMetersPerSecond: null,
      }] }
    },
    end: async () => undefined,
  } as unknown as Pool
  const app = buildApp({ database })

  const response = await app.inject({ method: 'GET', url: '/api/realtime/vehicles' })

  assert.equal(response.statusCode, 200)
  const body = response.json()
  assert.equal(body.status, 'current')
  assert.equal(body.snapshot.feedTimestamp, 1790000000)
  assert.equal(body.observations[0].reportedTripId, 'unmatched-trip')
  assert.equal(body.observations[0].matchedSurfaceTripId, null)
  assert.deepEqual(queries[0]?.values, ['ttc-vehicle-positions'])
  await app.close()
})

test('GET /api/realtime/vehicles distinguishes no collected observations', async () => {
  const database = { query: async () => ({ rows: [] }), end: async () => undefined } as unknown as Pool
  const app = buildApp({ database })
  const response = await app.inject({ method: 'GET', url: '/api/realtime/vehicles' })
  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), { status: 'empty', snapshot: null, observations: [] })
  await app.close()
})

test('GET /api/realtime/vehicles marks an old latest snapshot as stale', async () => {
  const database = {
    query: async (text: string) => text.includes('FROM vehicle_position_snapshots')
      ? { rows: [{ snapshotId: 'snapshot-1', fetchedAt: new Date(Date.now() - 181_000), feedTimestamp: '1790000000', vehicleCount: 0 }] }
      : { rows: [] },
    end: async () => undefined,
  } as unknown as Pool
  const app = buildApp({ database })
  const response = await app.inject({ method: 'GET', url: '/api/realtime/vehicles' })
  assert.equal(response.statusCode, 200)
  assert.equal(response.json().status, 'stale')
  await app.close()
})
