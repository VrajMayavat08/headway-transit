import generatedRoutes from './generated/ttc-surface-routes.json'

export type TtcSurfaceRoute = {
  routeId: string
  routeShortName: string
  routeLongName: string
  routeType: number
  officialRouteColor: string
}

type TtcRouteFeature = {
  type: 'Feature'
  properties: TtcSurfaceRoute
  geometry: { type: 'LineString' | 'Point'; coordinates: number[][] | number[] }
}

export const ttcSurfaceRouteCollection = generatedRoutes as { type: 'FeatureCollection'; features: TtcRouteFeature[] }

export const ttcSurfaceRoutes = ttcSurfaceRouteCollection.features
  .filter((feature) => feature.geometry.type === 'LineString')
  .map((feature) => feature.properties)

export function getTtcSurfaceRoute(routeId: string | null) {
  return routeId ? ttcSurfaceRoutes.find((route) => route.routeId === routeId) ?? null : null
}
