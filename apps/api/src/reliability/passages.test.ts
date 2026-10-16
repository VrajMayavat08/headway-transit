import assert from 'node:assert/strict'
import test from 'node:test'
import { analyzePassages, calculateHeadwayBounds, createObservationPoint, type Observation, type Shape } from './passages.js'

const shape: Shape = { routeId: '29', directionId: '0', shapeId: 'outbound', coordinates: [[-79.4, 43.65], [-79.38, 43.65]] }
const point = createObservationPoint(shape)!
const base = 1_790_000_000
function sample(vehicle: string, seconds: number, longitude: number, changes: Partial<Observation> = {}): Observation {
  return {
    vehicleId: vehicle, timestamp: base + seconds, fetchedAt: new Date((base + seconds + 10) * 1000).toISOString(),
    routeId: '29', matchedRouteId: '29', tripId: `trip-${vehicle}`, tripRouteId: '29', tripDirectionId: '0', directionId: 0,
    shapeId: 'outbound', latitude: 43.65, longitude, ...changes,
  }
}
function crossing(vehicle: string, seconds: number): Observation[] {
  return [sample(vehicle, seconds, -79.3903), sample(vehicle, seconds + 60, -79.3897)]
}

test('detects consecutive passages at one fixed point and returns bounds without invented crossing times', () => {
  const result = analyzePassages(point, [...crossing('a', 0), ...crossing('b', 600), ...crossing('c', 1200)])
  assert.equal(result.status, 'available')
  assert.equal(result.passageCount, 3)
  assert.equal(result.headwayCount, 2)
  assert.deepEqual(result.meanHeadwayBoundsSeconds, { minimum: 540, maximum: 660 })
  assert.deepEqual(result.passages[0], { vehicleId: 'a', tripId: 'trip-a', earliest: base, latest: base + 60 })
})

test('deduplicates repeated vehicle/source timestamps and rejects conflicting duplicates', () => {
  const rows = crossing('a', 0)
  const result = analyzePassages(point, [rows[0], { ...rows[0] }, rows[1]])
  assert.equal(result.passageCount, 1)
  assert.equal(result.rejected.duplicate, 1)
  const conflict = analyzePassages(point, [rows[0], { ...rows[0], longitude: -79.3898 }, rows[1]])
  assert.equal(conflict.passageCount, 0)
  assert.equal(conflict.rejected.conflictingDuplicate, 2)
  const lateConflict = analyzePassages(point, [rows[0], rows[1], { ...rows[0], longitude: -79.3898, fetchedAt: new Date((base + 70) * 1000).toISOString() }])
  assert.equal(lateConflict.passageCount, 0)
})

test('never combines opposite directions or different shape branches', () => {
  const rows = crossing('a', 0)
  assert.equal(analyzePassages(point, [rows[0], { ...rows[1], directionId: 1, tripDirectionId: '1' }]).passageCount, 0)
  assert.equal(analyzePassages(point, [rows[0], { ...rows[1], shapeId: 'branch-b' }]).passageCount, 0)
  const conflict = analyzePassages(point, crossing('a', 0).map((row) => ({ ...row, directionId: 1 })))
  assert.equal(conflict.passageCount, 0)
  assert.equal(conflict.rejected.directionConflict, 2)
})

test('missing identity, missing time, stale samples and excessive sample gaps cannot establish passages', () => {
  assert.equal(analyzePassages(point, crossing('a', 0).map((row) => ({ ...row, vehicleId: null }))).passageCount, 0)
  const rows = crossing('a', 0)
  assert.equal(analyzePassages(point, [rows[0], { ...rows[1], timestamp: null }]).passageCount, 0)
  assert.equal(analyzePassages(point, [rows[0], { ...rows[1], fetchedAt: new Date((base + 181) * 1000).toISOString() }]).passageCount, 0)
  assert.equal(analyzePassages(point, [rows[0], sample('a', 181, -79.3897)]).passageCount, 0)
  assert.equal(analyzePassages(point, [rows[0], sample('a', 1, -79.389)]).passageCount, 0)
  assert.equal(analyzePassages(point, [rows[0], { ...rows[1], tripRouteId: '35' }]).passageCount, 0)
  assert.equal(analyzePassages(point, [rows[0], { ...rows[1], latitude: Number.NaN }]).passageCount, 0)
  assert.equal(analyzePassages(point, crossing('a', 0).map((row) => ({ ...row, directionId: null }))).passageCount, 1)
})

test('one passage or one headway is insufficient and snapshot timestamp spacing is never a headway', () => {
  assert.equal(analyzePassages(point, crossing('a', 0)).meanHeadwayBoundsSeconds, null)
  assert.equal(analyzePassages(point, [...crossing('a', 0), ...crossing('b', 600)]).status, 'insufficient_data')
  assert.equal(analyzePassages(point, [sample('a', 0, -79.3903), sample('b', 600, -79.3897)]).headwayCount, 0)
})

test('overlapping passage brackets and repeat visits by one vehicle cannot establish consecutive headways', () => {
  assert.deepEqual(calculateHeadwayBounds([
    { vehicleId: 'a', tripId: 'a', earliest: 100, latest: 180 },
    { vehicleId: 'b', tripId: 'b', earliest: 150, latest: 210 },
    { vehicleId: 'c', tripId: 'c', earliest: 300, latest: 360 },
  ]), [])
  assert.deepEqual(calculateHeadwayBounds([
    { vehicleId: 'a', tripId: 'a', earliest: 100, latest: 150 },
    { vehicleId: 'a', tripId: 'b', earliest: 200, latest: 250 },
  ]), [])
})

test('ambiguous self-crossing shapes cannot supply an observation gate', () => {
  assert.equal(createObservationPoint({ ...shape, coordinates: [[-79.4, 43.65], [-79.38, 43.65], [-79.4, 43.65], [-79.38, 43.65]] }), null)
})

test('no headway crosses a collector outage', () => {
  const samples = [...crossing('a', 0), ...crossing('b', 600), ...crossing('c', 1200)]
  const result = analyzePassages(point, samples, [[base + 200, base + 500]])
  assert.equal(result.headwayCount, 1)
  assert.equal(result.status, 'insufficient_data')
})
