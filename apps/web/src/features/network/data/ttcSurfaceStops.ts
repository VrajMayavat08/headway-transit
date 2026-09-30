import generatedStops from './generated/ttc-surface-stops.json'

export type TtcSurfaceStop = {
  stopId: string
  stopName: string
  stopLat: number
  stopLon: number
  routeIds: string[]
  routeShortNames: string[]
}

type TtcStopFeature = {
  type: 'Feature'
  properties: TtcSurfaceStop
  geometry: { type: 'Point'; coordinates: number[] }
}

export const ttcSurfaceStopCollection = generatedStops as { type: 'FeatureCollection'; features: TtcStopFeature[] }

export function getTtcSurfaceStop(stopId: string | null) {
  return stopId ? ttcSurfaceStopCollection.features.find((feature) => feature.properties.stopId === stopId)?.properties ?? null : null
}
