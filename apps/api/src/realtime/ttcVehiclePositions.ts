import GtfsRealtimeBindings from 'gtfs-realtime-bindings'

export const TTC_VEHICLE_POSITIONS_URL = 'https://bustime.ttc.ca/gtfsrt/vehicles'

export type TtcVehiclePosition = {
  entityId: string
  vehicleId: string | null
  routeId: string | null
  tripId: string | null
  directionId: number | null
  latitude: number
  longitude: number
  bearing: number | null
  speedMetersPerSecond: number | null
  timestamp: number | null
  currentStopSequence: number | null
  stopId: string | null
}

export type TtcVehiclePositionSnapshot = {
  fetchedAt: string
  feedTimestamp: number | null
  vehicles: TtcVehiclePosition[]
}

export type RealtimeFetchResponse = {
  ok: boolean
  status: number
  statusText: string
  arrayBuffer: () => Promise<ArrayBuffer>
}

export type RealtimeFetch = (url: string, init: { headers: Record<string, string> }) => Promise<RealtimeFetchResponse>

export class TtcRealtimeFetchError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TtcRealtimeFetchError'
  }
}

function optionalText(value: string | null | undefined) {
  return value || null
}

function optionalNumber(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (value && typeof value === 'object' && 'toString' in value) {
    const parsed = Number(value.toString())
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function validCoordinate(latitude: number, longitude: number) {
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
}

export async function fetchTtcVehiclePositions(
  fetcher: RealtimeFetch = fetch,
  now = () => new Date(),
): Promise<TtcVehiclePositionSnapshot> {
  const response = await fetcher(TTC_VEHICLE_POSITIONS_URL, {
    headers: { Accept: 'application/x-protobuf' },
  })
  if (!response.ok) throw new TtcRealtimeFetchError(`TTC vehicle positions request failed: ${response.status} ${response.statusText}`)

  const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(await response.arrayBuffer()))
  const vehicles = feed.entity.flatMap((entity) => {
    const vehicle = entity.vehicle
    const latitude = optionalNumber(vehicle?.position?.latitude)
    const longitude = optionalNumber(vehicle?.position?.longitude)
    if (!vehicle || latitude === null || longitude === null || !validCoordinate(latitude, longitude)) return []

    return [{
      entityId: entity.id,
      vehicleId: optionalText(vehicle.vehicle?.id),
      routeId: optionalText(vehicle.trip?.routeId),
      tripId: optionalText(vehicle.trip?.tripId),
      // Protobuf supplies prototype defaults for absent optional fields. Missing is not direction 0.
      directionId: vehicle.trip && Object.hasOwn(vehicle.trip, 'directionId') ? optionalNumber(vehicle.trip.directionId) : null,
      latitude,
      longitude,
      bearing: optionalNumber(vehicle.position?.bearing),
      speedMetersPerSecond: optionalNumber(vehicle.position?.speed),
      timestamp: optionalNumber(vehicle.timestamp),
      currentStopSequence: optionalNumber(vehicle.currentStopSequence),
      stopId: optionalText(vehicle.stopId),
    }]
  })

  return {
    fetchedAt: now().toISOString(),
    feedTimestamp: optionalNumber(feed.header.timestamp),
    vehicles,
  }
}
