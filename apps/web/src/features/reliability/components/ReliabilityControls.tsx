import type { ReliabilityMetric, ReliabilityTimeRange } from '@/features/reliability/types'
import type { TtcSurfaceRoute } from '@/features/network/data/ttcSurfaceRoutes'

type ReliabilityControlsProps = {
  routes: TtcSurfaceRoute[]
  routeId: string
  range: ReliabilityTimeRange
  metric: ReliabilityMetric
  onRouteChange: (routeId: string) => void
  onRangeChange: (range: ReliabilityTimeRange) => void
  onMetricChange: (metric: ReliabilityMetric) => void
}

export function ReliabilityControls({ routes, routeId, range, metric, onRouteChange, onRangeChange, onMetricChange }: ReliabilityControlsProps) {
  return (
    <div className="reliability-controls" aria-label="Reliability analysis controls">
      <label>
        <span>ROUTE</span>
        <select value={routeId} onChange={(event) => onRouteChange(event.target.value)}>
          <option value="all">All imported routes</option>
          {routes.map((route) => <option key={route.routeId} value={route.routeId}>{route.routeShortName} {route.routeLongName}</option>)}
        </select>
      </label>
      <label>
        <span>RANGE</span>
        <select value={range} onChange={(event) => onRangeChange(event.target.value as ReliabilityTimeRange)}>
          <option value="today">Today</option>
          <option value="7-days">7 days</option>
          <option value="30-days">30 days</option>
        </select>
      </label>
      <label>
        <span>METRIC</span>
        <select value={metric} onChange={(event) => onMetricChange(event.target.value as ReliabilityMetric)}>
          <option value="on-time">On-time</option>
          <option value="headway">Headway</option>
          <option value="bunching">Bunching</option>
          <option value="service-gaps">Service gaps</option>
        </select>
      </label>
    </div>
  )
}
