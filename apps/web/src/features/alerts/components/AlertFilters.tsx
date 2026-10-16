import type { TtcSurfaceRoute } from '@/features/network/data/ttcSurfaceRoutes'

type AlertFiltersProps = {
  routeId: string
  query: string
  routes: TtcSurfaceRoute[]
  onRouteChange: (routeId: string) => void
  onQueryChange: (query: string) => void
}

export function AlertFilters({ routeId, query, routes, onRouteChange, onQueryChange }: AlertFiltersProps) {
  return <div className="alert-filters" aria-label="Alert filters">
    <label><span>ROUTE</span><select value={routeId} onChange={(event) => onRouteChange(event.target.value)}><option value="all">All routes</option>{routes.map((route) => <option key={route.routeId} value={route.routeId}>{route.routeShortName} {route.routeLongName}</option>)}</select></label>
    <label className="alert-search"><span className="visually-hidden">Search alerts</span><input type="search" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search alert text or route" /></label>
  </div>
}
