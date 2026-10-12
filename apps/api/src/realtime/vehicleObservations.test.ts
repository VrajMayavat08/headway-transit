import assert from 'node:assert/strict'
import test from 'node:test'
import type { PoolClient } from 'pg'
import { matchSurfaceIdentifiers, persistVehicleSnapshot } from './vehicleObservations.js'
import type { TtcVehiclePositionSnapshot } from './ttcVehiclePositions.js'

const snapshot: TtcVehiclePositionSnapshot = {
  fetchedAt: '2026-10-12T12:00:00.000Z',
  feedTimestamp: 1_790_000_000,
  vehicles: [{
    entityId: 'entity-1', vehicleId: 'bus-1', routeId: '29', tripId: 'trip-29', stopId: 'stop-29', directionId: 0,
    latitude: 43.65, longitude: -79.4, bearing: null, speedMetersPerSecond: null, timestamp: 1_790_000_001, currentStopSequence: 4,
  }],
}

test('keeps reported identifiers while matching only against SurfaceGTFS identifiers', () => {
  const [matched] = matchSurfaceIdentifiers(snapshot.vehicles, {
    routeIds: new Set(['29']), tripIds: new Set<string>(), stopIds: new Set(['stop-29']),
  })
  assert.equal(matched?.tripId, 'trip-29')
  assert.equal(matched?.matchedSurfaceRouteId, '29')
  assert.equal(matched?.matchedSurfaceTripId, null)
  assert.equal(matched?.matchedSurfaceStopId, 'stop-29')
})

test('persists a new snapshot transactionally and does not insert an already-seen feed timestamp', async () => {
  const queries: Array<{ text: string; values?: unknown[] }> = []
  let insertSnapshotCalls = 0
  const client = {
    query: async (text: string, values?: unknown[]) => {
      queries.push({ text, values })
      if (text.includes('INSERT INTO vehicle_position_snapshots')) {
        insertSnapshotCalls += 1
        return { rows: insertSnapshotCalls === 1 ? [{ snapshotId: 'snapshot-1' }] : [] }
      }
      if (text.includes('FROM routes')) return { rows: [{ routeId: '29' }] }
      if (text.includes('FROM trips')) return { rows: [{ tripId: 'trip-29' }] }
      if (text.includes('FROM stops')) return { rows: [] }
      return { rows: [] }
    },
  } as unknown as PoolClient

  const inserted = await persistVehicleSnapshot(client, snapshot, 604_800_000)
  const duplicate = await persistVehicleSnapshot(client, snapshot, 604_800_000)

  assert.deepEqual(inserted, { inserted: true, snapshotId: 'snapshot-1', observationCount: 1 })
  assert.deepEqual(duplicate, { inserted: false, snapshotId: null, observationCount: 0 })
  assert.ok(queries.some(({ text, values }) => text.includes('FROM trips') && values?.[0] === 'ttc-surface'))
  assert.equal(queries.some(({ text, values }) => text.includes('FROM trips') && values?.includes('ttc-static')), false)
  const observationInsert = queries.find(({ text }) => text.includes('INSERT INTO vehicle_observations'))
  assert.ok(observationInsert)
  assert.ok(observationInsert.values?.includes('trip-29'))
  assert.equal(observationInsert.values?.filter((value) => value === 'stop-29').length, 1)
  assert.ok(queries.some(({ text, values }) => text.startsWith('DELETE FROM vehicle_position_snapshots') && values?.[0] === 'ttc-vehicle-positions'))
})
