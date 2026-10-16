import assert from 'node:assert/strict'
import test from 'node:test'
import type { Pool } from 'pg'
import { buildApp } from '../app.js'
import { getPlaybackVehicles } from './vehicles.js'

const now = new Date('2026-10-16T16:00:00.000Z')
const requested = '2026-10-16T14:00:00.000Z'
const sixHours = 6 * 60 * 60_000
const snapshot = { snapshotId: 's1', fetchedAt: new Date('2026-10-16T14:00:20.000Z'), feedTimestamp: '1792159190', vehicleCount: 1 }

function fakeDatabase(selected: typeof snapshot | null = snapshot, vehicleCount = 1, catalogCount = 1) {
  const queries: { text: string; values?: unknown[] }[] = []
  let released = false
  const database = {
    connect: async () => ({
      query: async (text: string, values?: unknown[]) => {
        queries.push({ text, values })
        if (text.startsWith('SELECT fetched_at')) return { rows: Array.from({ length: catalogCount }, (_, index) => ({ fetchedAt: new Date(snapshot.fetchedAt.getTime() - index * 1000) })) }
        if (text.includes('UNION ALL')) return { rows: selected ? [selected] : [] }
        if (text.includes('FROM vehicle_observations')) return { rows: Array.from({ length: vehicleCount }, (_, index) => ({ entityId: `e${index}`, vehicleId: '3640', sourceTimestamp: '1792159180', reportedRouteId: '29', reportedTripId: null, latitude: 43.65, longitude: -79.4 })) }
        return { rows: [] }
      },
      release() { released = true },
    }),
    end: async () => undefined,
  } as unknown as Pool
  return { database, queries, released: () => released }
}

test('nearest timestamp selection uses two bounded index walks, deterministic ties, and real snapshot metadata', async () => {
  const { database, queries, released } = fakeDatabase()
  const result = await getPlaybackVehicles(database, requested, undefined, sixHours, now)
  assert.equal(result.status, 'available')
  assert.equal(result.requestedAt, requested)
  assert.equal(result.snapshot?.fetchedAt, snapshot.fetchedAt.toISOString())
  assert.equal(result.observations[0]?.sourceTimestamp, 1792159180)
  const selection = queries.find(({ text }) => text.includes('UNION ALL'))!
  assert.deepEqual(selection.values, ['ttc-vehicle-positions', new Date('2026-10-16T13:58:30Z'), new Date(requested), new Date('2026-10-16T14:01:30Z')])
  assert.match(selection.text, /ORDER BY fetched_at DESC LIMIT 1/)
  assert.match(selection.text, /ORDER BY fetched_at ASC LIMIT 1/)
  assert.match(selection.text, /abs\(extract/)
  assert.match(selection.text, /"fetchedAt", "snapshotId" LIMIT 1/)
  assert.equal(result.window.start, snapshot.fetchedAt.toISOString())
  assert.equal(released(), true)
})

test('route filtering uses reported route IDs on the selected snapshot and a hard vehicle limit', async () => {
  const { database, queries } = fakeDatabase()
  const result = await getPlaybackVehicles(database, requested, '29', sixHours, now)
  assert.equal(result.routeId, '29')
  const vehicles = queries.find(({ text }) => text.includes('FROM vehicle_observations'))!
  assert.match(vehicles.text, /reported_route_id = \$3/)
  assert.deepEqual(vehicles.values, ['s1', 3001, '29'])
  assert.equal(queries.some(({ text }) => text.includes('ttc-static') || text.includes('JOIN trips')), false)
})

test('missing snapshots return no_data, rather than using an observation beyond tolerance', async () => {
  const { database } = fakeDatabase(null)
  const result = await getPlaybackVehicles(database, requested, undefined, sixHours, now)
  assert.equal(result.status, 'no_data')
  assert.equal(result.snapshot, null)
  assert.deepEqual(result.observations, [])
})

test('empty collection windows and empty route matches remain honest; oversized responses are explicitly truncated', async () => {
  const empty = await getPlaybackVehicles(fakeDatabase(null, 0, 0).database, requested, undefined, sixHours, now)
  assert.equal(empty.status, 'no_data')
  assert.deepEqual(empty.window, { start: null, end: null })
  assert.deepEqual(empty.timeline, [])
  const noVehicles = await getPlaybackVehicles(fakeDatabase(snapshot, 0).database, requested, 'unknown-route', sixHours, now)
  assert.equal(noVehicles.status, 'available')
  assert.deepEqual(noVehicles.observations, [])
  const limited = await getPlaybackVehicles(fakeDatabase(snapshot, 3001, 2001).database, requested, undefined, sixHours, now)
  assert.equal(limited.observations.length, 3000)
  assert.equal(limited.observationsTruncated, true)
  assert.equal(limited.timeline.length, 2000)
  assert.equal(limited.timelineTruncated, true)
  assert.ok(limited.timeline[0] < limited.timeline[1999])
})

test('retention boundary is inclusive and older requested times never query vehicle positions', async () => {
  const { database, queries } = fakeDatabase(null)
  const before = await getPlaybackVehicles(database, '2026-10-16T09:59:59.999Z', undefined, sixHours, now)
  assert.equal(before.status, 'outside_retention')
  assert.equal(queries.some(({ text }) => text.includes('UNION ALL')), false)
  const atBoundary = await getPlaybackVehicles(database, '2026-10-16T10:00:00.000Z', undefined, sixHours, now)
  assert.equal(atBoundary.status, 'no_data')
  const selection = queries.find(({ text }) => text.includes('UNION ALL'))!
  assert.equal((selection.values?.[1] as Date).toISOString(), '2026-10-16T10:00:00.000Z')
  assert.equal((await getPlaybackVehicles(database, '2026-10-16T16:00:01.000Z', undefined, sixHours, now)).status, 'no_data')
})

test('historical endpoint rejects missing/invalid timestamps and invalid route filters before reading the database', async () => {
  const { database, queries } = fakeDatabase()
  const app = buildApp({ database })
  try {
    for (const url of [
      '/api/playback/vehicles', '/api/playback/vehicles?timestamp=invalid',
      '/api/playback/vehicles?timestamp=2026-02-30T12:00:00Z',
      `/api/playback/vehicles?timestamp=${requested}&routeId=`,
      `/api/playback/vehicles?timestamp=${requested}&routeId=${'x'.repeat(65)}`,
    ]) assert.equal((await app.inject(url)).statusCode, 400)
    assert.equal(queries.length, 0)
  } finally { await app.close() }
})

test('historical endpoint returns bounded persisted observations and safe database errors', async () => {
  const { database } = fakeDatabase()
  const app = buildApp({ database })
  try {
    const response = await app.inject(`/api/playback/vehicles?timestamp=${new Date().toISOString()}&routeId=29`)
    assert.equal(response.statusCode, 200)
    assert.equal(response.json().status, 'available')
    assert.equal(response.json().observations[0].vehicleId, '3640')
  } finally { await app.close() }
  const failed = buildApp({ database: { connect: async () => { throw new Error('private connection string') }, end: async () => undefined } as unknown as Pool })
  try {
    const response = await failed.inject(`/api/playback/vehicles?timestamp=${requested}`)
    assert.equal(response.statusCode, 503)
    assert.deepEqual(response.json(), { status: 'unavailable' })
  } finally { await failed.close() }
})
