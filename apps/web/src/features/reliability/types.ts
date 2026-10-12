export type ReliabilityMetric = 'on-time' | 'headway' | 'bunching' | 'service-gaps'
export type ReliabilityTimeRange = 'today' | '7-days' | '30-days'
export type ReliabilityDataState = 'available' | 'unavailable' | 'stale'

export interface ReliabilityObservationRange {
  start: string
  end: string
  label: string
}

export interface ReliabilityMetricValue {
  metric: ReliabilityMetric
  value: number | null
  unit: 'percent' | 'minutes' | 'count'
  sampleSize: number | null
  freshness: string | null
  state: ReliabilityDataState
}

export interface RouteReliabilitySummary {
  routeId: string
  range: ReliabilityObservationRange
  metrics: ReliabilityMetricValue[]
}
