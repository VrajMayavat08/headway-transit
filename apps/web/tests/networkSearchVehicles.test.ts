import assert from 'node:assert/strict'
import test from 'node:test'
import { filterNetworkRoutes, nextNetworkSearchIndex } from '../src/features/network/lib/routeSearch.ts'
import { vehiclesForSelectedRoute } from '../src/features/network/lib/vehicleVisibility.ts'

const routes = [
  { routeId: '29', shortName: '29', longName: 'Dufferin', routeType: 'Bus', color: null },
  { routeId: '35', shortName: '35', longName: 'Jane', routeType: 'Bus', color: null },
  { routeId: '501', shortName: '501', longName: 'Queen', routeType: 'Streetcar', color: null },
  { routeId: '1', shortName: '1', longName: 'Yonge-University', routeType: 'Subway', color: null },
]
const featuredRouteIds = new Set(['29', '35', '501'])

test('network search filters supported API routes by number and name', () => {
  assert.deepEqual(filterNetworkRoutes(routes, '35', featuredRouteIds).map((route) => route.routeId), ['35'])
  assert.deepEqual(filterNetworkRoutes(routes, 'queen', featuredRouteIds).map((route) => route.routeId), ['501'])
  assert.deepEqual(filterNetworkRoutes(routes, '', featuredRouteIds).map((route) => route.routeId), ['29', '35', '501'])
})

test('network search keyboard navigation wraps and handles no results', () => {
  assert.equal(nextNetworkSearchIndex(-1, 3, 'ArrowDown'), 0)
  assert.equal(nextNetworkSearchIndex(2, 3, 'ArrowDown'), 0)
  assert.equal(nextNetworkSearchIndex(0, 3, 'ArrowUp'), 2)
  assert.equal(nextNetworkSearchIndex(-1, 0, 'ArrowDown'), -1)
})

test('vehicle visibility uses only the selected route reported by the feed', () => {
  const observations = [
    { entityId: 'a', vehicleId: 'a', reportedRouteId: '29', matchedSurfaceRouteId: null, sourceTimestamp: null, matchedSurfaceTripId: null, latitude: 43.7, longitude: -79.4 },
    { entityId: 'b', vehicleId: 'b', reportedRouteId: '35', matchedSurfaceRouteId: null, sourceTimestamp: null, matchedSurfaceTripId: null, latitude: 43.7, longitude: -79.4 },
    { entityId: 'c', vehicleId: 'c', reportedRouteId: null, matchedSurfaceRouteId: null, sourceTimestamp: null, matchedSurfaceTripId: null, latitude: 43.7, longitude: -79.4 },
  ]
  assert.deepEqual(vehiclesForSelectedRoute(observations, '35').map((vehicle) => vehicle.entityId), ['b'])
  assert.deepEqual(vehiclesForSelectedRoute(observations, null), [])
})
