export type ScheduleRoute = {
  routeId: string
  shortName: string | null
  longName: string | null
  routeType: string
  color: string | null
}

export const scheduleRoutesQueryKey = ['schedule-routes'] as const

export type ScheduleRouteStop = {
  stopId: string
  stopName: string | null
  latitude: number
  longitude: number
  sequence: number
}

export type ScheduleRouteStopPattern = {
  directionId: string | null
  tripId: string
  headsign: string | null
  tripCount: number
  stops: ScheduleRouteStop[]
}

export type ScheduleRouteStops = {
  routeId: string
  patterns: ScheduleRouteStopPattern[]
}

export type ScheduleRouteGeometryFeature = {
  type: 'Feature'
  properties: {
    routeId: string
    directionId: string | null
    shapeId: string
    tripId: string
    tripCount: number
  }
  geometry: {
    type: 'LineString'
    coordinates: [number, number][]
  }
}

export type ScheduleRouteGeometry = {
  type: 'FeatureCollection'
  features: ScheduleRouteGeometryFeature[]
}

function isScheduleRoute(value: unknown): value is ScheduleRoute {
  if (!value || typeof value !== 'object') return false

  const route = value as Record<string, unknown>
  return typeof route.routeId === 'string'
    && (typeof route.shortName === 'string' || route.shortName === null)
    && (typeof route.longName === 'string' || route.longName === null)
    && typeof route.routeType === 'string'
    && (typeof route.color === 'string' || route.color === null)
}

export async function fetchScheduleRoutes(): Promise<ScheduleRoute[]> {
  const response = await fetch('/api/routes')
  if (!response.ok) throw new Error('TTC schedule routes are unavailable.')

  const data: unknown = await response.json()
  if (!Array.isArray(data) || !data.every(isScheduleRoute)) {
    throw new Error('TTC schedule routes returned an invalid response.')
  }

  return data
}

function isScheduleRouteStop(value: unknown): value is ScheduleRouteStop {
  if (!value || typeof value !== 'object') return false

  const stop = value as Record<string, unknown>
  return typeof stop.stopId === 'string'
    && (typeof stop.stopName === 'string' || stop.stopName === null)
    && typeof stop.latitude === 'number'
    && typeof stop.longitude === 'number'
    && typeof stop.sequence === 'number'
}

function isScheduleRouteStopPattern(value: unknown): value is ScheduleRouteStopPattern {
  if (!value || typeof value !== 'object') return false

  const pattern = value as Record<string, unknown>
  return (typeof pattern.directionId === 'string' || pattern.directionId === null)
    && typeof pattern.tripId === 'string'
    && (typeof pattern.headsign === 'string' || pattern.headsign === null)
    && typeof pattern.tripCount === 'number'
    && Array.isArray(pattern.stops)
    && pattern.stops.every(isScheduleRouteStop)
}

export function scheduleRouteStopsQueryKey(routeId: string | null) {
  return ['schedule-route-stops', routeId] as const
}

export async function fetchScheduleRouteStops(routeId: string): Promise<ScheduleRouteStops> {
  const response = await fetch(`/api/routes/${encodeURIComponent(routeId)}/stops`)
  if (!response.ok) throw new Error('TTC route stops are unavailable.')

  const data: unknown = await response.json()
  if (!data || typeof data !== 'object') throw new Error('TTC route stops returned an invalid response.')

  const routeStops = data as Record<string, unknown>
  if (routeStops.routeId !== routeId || !Array.isArray(routeStops.patterns) || !routeStops.patterns.every(isScheduleRouteStopPattern)) {
    throw new Error('TTC route stops returned an invalid response.')
  }

  return { routeId, patterns: routeStops.patterns }
}

function isScheduleRouteGeometryFeature(value: unknown): value is ScheduleRouteGeometryFeature {
  if (!value || typeof value !== 'object') return false

  const feature = value as Record<string, unknown>
  const properties = feature.properties as Record<string, unknown> | undefined
  const geometry = feature.geometry as Record<string, unknown> | undefined
  return feature.type === 'Feature'
    && typeof properties?.routeId === 'string'
    && (typeof properties.directionId === 'string' || properties.directionId === null)
    && typeof properties.shapeId === 'string'
    && typeof properties.tripId === 'string'
    && typeof properties.tripCount === 'number'
    && geometry?.type === 'LineString'
    && Array.isArray(geometry.coordinates)
    && geometry.coordinates.every((coordinate) => (
      Array.isArray(coordinate)
      && coordinate.length === 2
      && typeof coordinate[0] === 'number'
      && typeof coordinate[1] === 'number'
    ))
}

export function scheduleRouteGeometryQueryKey(routeId: string | null) {
  return ['schedule-route-geometry', routeId] as const
}

export async function fetchScheduleRouteGeometry(routeId: string): Promise<ScheduleRouteGeometry> {
  const response = await fetch(`/api/routes/${encodeURIComponent(routeId)}/geometry`)
  if (!response.ok) throw new Error('TTC route geometry is unavailable.')

  const data: unknown = await response.json()
  if (!data || typeof data !== 'object') throw new Error('TTC route geometry returned an invalid response.')

  const geometry = data as Record<string, unknown>
  if (geometry.type !== 'FeatureCollection' || !Array.isArray(geometry.features) || !geometry.features.every(isScheduleRouteGeometryFeature)) {
    throw new Error('TTC route geometry returned an invalid response.')
  }

  return { type: 'FeatureCollection', features: geometry.features }
}
