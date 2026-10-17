import generatedRoutes from './generated/ttc-surface-routes.json'

export type TtcSurfaceRoute = {
  routeId: string
  routeShortName: string
  routeLongName: string
  routeType: number
  officialRouteColor: string
  patternId: string
  shapeId: string
  representativeTripId: string
  tripCount: number
  directionId: string | null
  headsign: string | null
  isPrimary: boolean
}

type TtcRouteFeature = {
  type: 'Feature'
  properties: TtcSurfaceRoute
  geometry: { type: 'LineString' | 'Point'; coordinates: number[][] | number[] }
}

export const ttcSurfaceRouteCollection = generatedRoutes as { type: 'FeatureCollection'; features: TtcRouteFeature[] }

export const ttcSurfaceRoutes = ttcSurfaceRouteCollection.features
  .filter((feature) => feature.geometry.type === 'LineString' && feature.properties.isPrimary)
  .map((feature) => feature.properties)

export function getTtcSurfaceRoute(routeId: string | null) {
  return routeId ? ttcSurfaceRoutes.find((route) => route.routeId === routeId) ?? null : null
}

export function getTtcSurfaceRouteGeometry(routeId: string | null) {
  if (!routeId) return null

  const feature = ttcSurfaceRouteCollection.features.find(
    (candidate) => candidate.geometry.type === 'LineString' && candidate.properties.routeId === routeId && candidate.properties.isPrimary,
  )

  return feature?.geometry.type === 'LineString' ? feature.geometry.coordinates as number[][] : null
}
