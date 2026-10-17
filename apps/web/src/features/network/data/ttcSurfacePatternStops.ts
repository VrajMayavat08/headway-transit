import generatedPatternStops from './generated/ttc-surface-pattern-stops.json'

export type TtcSurfacePatternStop = {
  routeId: string
  stopId: string
  stopName: string
  stopLat: number
  stopLon: number
  patternIds: string[]
}

type TtcPatternStopFeature = {
  type: 'Feature'
  properties: TtcSurfacePatternStop
  geometry: { type: 'Point'; coordinates: number[] }
}

export const ttcSurfacePatternStopCollection = generatedPatternStops as {
  type: 'FeatureCollection'
  features: TtcPatternStopFeature[]
}
