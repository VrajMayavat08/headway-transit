export type SourceAlertSeverity = 'info' | 'warning' | 'severe'

export interface AlertActivePeriod { start: string | null; end: string | null }

export interface ServiceAlert {
  alertId: string
  title: string | null
  description: string | null
  affectedRouteIds: string[]
  affectedStopIds: string[]
  cause: string | null
  effect: string | null
  severity: SourceAlertSeverity | null
  activePeriods: AlertActivePeriod[]
  url: string | null
  source: string
  lastUpdatedAt: string | null
}

export interface AlertsResponse {
  status: 'available' | 'empty'
  source: { name: string; url: string; attribution: string }
  fetchedAt: string
  feedTimestamp: string | null
  routeId: string | null
  totalAlertCount: number
  alerts: ServiceAlert[]
}
