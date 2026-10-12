export type AlertLifecycleStatus = 'active' | 'upcoming' | 'historical'
export type NormalizedAlertSeverity = 'critical' | 'major' | 'minor' | 'unknown'

export interface AlertActivePeriod { start: string | null; end: string | null }

export interface ServiceAlert {
  alertId: string
  agencyId: string
  source: string
  headerText: string
  descriptionText: string | null
  affectedRouteIds: string[]
  affectedStopIds: string[]
  activePeriods: AlertActivePeriod[]
  gtfsRealtimeEffect: string | null
  gtfsRealtimeCause: string | null
  normalizedSeverity: NormalizedAlertSeverity
  lifecycleStatus: AlertLifecycleStatus
  lastUpdatedAt: string | null
}
