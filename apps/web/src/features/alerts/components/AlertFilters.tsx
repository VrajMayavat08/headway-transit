import type { AlertLifecycleStatus, NormalizedAlertSeverity } from '@/features/alerts/types'
import type { TtcSurfaceRoute } from '@/features/network/data/ttcSurfaceRoutes'

type AlertFiltersProps = {
  status: 'all' | AlertLifecycleStatus; severity: 'all' | Exclude<NormalizedAlertSeverity, 'unknown'>; routeId: string; query: string; routes: TtcSurfaceRoute[]
  onStatusChange: (value: 'all' | AlertLifecycleStatus) => void; onSeverityChange: (value: 'all' | Exclude<NormalizedAlertSeverity, 'unknown'>) => void; onRouteChange: (routeId: string) => void; onQueryChange: (query: string) => void
}

export function AlertFilters({ status, severity, routeId, query, routes, onStatusChange, onSeverityChange, onRouteChange, onQueryChange }: AlertFiltersProps) {
  return <div className="alert-filters" aria-label="Alert filters">
    <label><span>STATUS</span><select value={status} onChange={(event) => onStatusChange(event.target.value as AlertFiltersProps['status'])}><option value="active">Active</option><option value="upcoming">Upcoming</option><option value="historical">Historical</option><option value="all">All</option></select></label>
    <label><span>SEVERITY</span><select value={severity} onChange={(event) => onSeverityChange(event.target.value as AlertFiltersProps['severity'])}><option value="all">All</option><option value="critical">Critical</option><option value="major">Major</option><option value="minor">Minor</option></select></label>
    <label><span>ROUTE</span><select value={routeId} onChange={(event) => onRouteChange(event.target.value)}><option value="all">All routes</option>{routes.map((route) => <option key={route.routeId} value={route.routeId}>{route.routeShortName} {route.routeLongName}</option>)}</select></label>
    <label className="alert-search"><span className="visually-hidden">Search alerts</span><input type="search" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search alert text or route" /></label>
  </div>
}
