import { useState } from 'react'
import { HeadwayAnalysis, ServiceEvents } from '@/features/reliability/components/AnalysisEmptyStates'
import { ReliabilityControls } from '@/features/reliability/components/ReliabilityControls'
import { ReliabilityOverview } from '@/features/reliability/components/ReliabilityOverview'
import { RouteComparison } from '@/features/reliability/components/RouteComparison'
import type { ReliabilityMetric, ReliabilityTimeRange } from '@/features/reliability/types'
import { ttcSurfaceRoutes } from '@/features/network/data/ttcSurfaceRoutes'

export function ReliabilityPage() {
  const [routeId, setRouteId] = useState('all')
  const [range, setRange] = useState<ReliabilityTimeRange>('today')
  const [metric, setMetric] = useState<ReliabilityMetric>('on-time')

  return (
    <section className="reliability-page" aria-labelledby="page-title">
      <header className="reliability-page-header">
        <div><span>RELIABILITY</span><h1 id="page-title">Service analysis</h1><p>Static route context is ready. Observed service performance will follow telemetry collection.</p></div>
        <ReliabilityControls routes={ttcSurfaceRoutes} routeId={routeId} range={range} metric={metric} onRouteChange={setRouteId} onRangeChange={setRange} onMetricChange={setMetric} />
      </header>
      <ReliabilityOverview />
      <RouteComparison routes={routeId === 'all' ? ttcSurfaceRoutes : ttcSurfaceRoutes.filter((route) => route.routeId === routeId)} />
      <div className="reliability-analysis-grid"><HeadwayAnalysis /><ServiceEvents /></div>
    </section>
  )
}
