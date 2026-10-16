import assert from 'node:assert/strict'
import test from 'node:test'
import GtfsRealtimeBindings from 'gtfs-realtime-bindings'
import { fetchTtcVehiclePositions, TTC_VEHICLE_POSITIONS_URL, TtcRealtimeFetchError } from './ttcVehiclePositions.js'

function protobufResponse(feed: unknown) {
  const encoded = GtfsRealtimeBindings.transit_realtime.FeedMessage.encode(feed as never).finish()
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    arrayBuffer: async () => Uint8Array.from(encoded).buffer as ArrayBuffer,
  }
}

test('fetchTtcVehiclePositions decodes valid vehicle positions and omits entities without usable locations', async () => {
  let request: { url: string; headers: Record<string, string> } | undefined
  const snapshot = await fetchTtcVehiclePositions(async (url, init) => {
    request = { url, headers: init.headers }
    return protobufResponse({
      header: { gtfsRealtimeVersion: '2.0', timestamp: 1_700_000_000 },
      entity: [
        {
          id: 'vehicle-1',
          vehicle: {
            trip: { routeId: '29', tripId: 'trip-1', directionId: 0 },
            vehicle: { id: 'bus-100' },
            position: { latitude: 43.65, longitude: -79.4, bearing: 90, speed: 12.5 },
            timestamp: 1_700_000_001,
            currentStopSequence: 4,
            stopId: '1234',
          },
        },
        { id: 'vehicle-without-position', vehicle: { trip: { routeId: '29' } } },
      ],
    })
  }, () => new Date('2026-10-12T12:00:00.000Z'))

  assert.deepEqual(request, {
    url: TTC_VEHICLE_POSITIONS_URL,
    headers: { Accept: 'application/x-protobuf' },
  })
  assert.equal(snapshot.fetchedAt, '2026-10-12T12:00:00.000Z')
  assert.equal(snapshot.feedTimestamp, 1_700_000_000)
  assert.equal(snapshot.vehicles.length, 1)
  const vehicle = snapshot.vehicles[0]
  assert.ok(vehicle)
  assert.ok(Math.abs(vehicle.latitude - 43.65) < 0.00001)
  assert.ok(Math.abs(vehicle.longitude + 79.4) < 0.00001)
  assert.deepEqual({ ...vehicle, latitude: undefined, longitude: undefined }, {
    entityId: 'vehicle-1', vehicleId: 'bus-100', routeId: '29', tripId: 'trip-1', directionId: 0,
    latitude: undefined, longitude: undefined, bearing: 90, speedMetersPerSecond: 12.5,
    timestamp: 1_700_000_001, currentStopSequence: 4, stopId: '1234',
  })
})

test('fetchTtcVehiclePositions fails safely for a non-success TTC response', async () => {
  await assert.rejects(
    fetchTtcVehiclePositions(async () => ({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      arrayBuffer: async () => new ArrayBuffer(0),
    })),
    TtcRealtimeFetchError,
  )
})

test('omitted protobuf direction is unknown, while an explicit zero stays zero', async () => {
  const snapshot = await fetchTtcVehiclePositions(async () => protobufResponse({
    header: { gtfsRealtimeVersion: '2.0' },
    entity: [
      { id: 'missing', vehicle: { trip: { routeId: '29' }, position: { latitude: 43.65, longitude: -79.4 } } },
      { id: 'zero', vehicle: { trip: { routeId: '29', directionId: 0 }, position: { latitude: 43.65, longitude: -79.4 } } },
    ],
  }))
  assert.equal(snapshot.vehicles[0]?.directionId, null)
  assert.equal(snapshot.vehicles[1]?.directionId, 0)
})
