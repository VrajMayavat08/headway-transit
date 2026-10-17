import { useState } from 'react'
import { HeadwayAnalysis } from '@/features/reliability/components/ObservedHeadways'
import { ReliabilityControls } from '@/features/reliability/components/ReliabilityControls'
import type { ReliabilityMetric, ReliabilityTimeRange } from '@/features/reliability/types'
import { ttcSurfaceRoutes } from '@/features/network/data/ttcSurfaceRoutes'

export function ReliabilityPage() {
  const [routeId, setRouteId] = useState('all')
  const [range, setRange] = useState<ReliabilityTimeRange>('today')
  const [metric, setMetric] = useState<ReliabilityMetric>('headway')

  return (
    <section className="reliability-page" aria-labelledby="page-title">
      <header className="reliability-page-header">
        <div><span>RELIABILITY</span><h1 id="page-title">Observed headway analysis</h1><p>Vehicle passages from the latest 60 minutes. Headway bounds account for sampling uncertainty; route-wide performance scores are not yet available.</p></div>
        <ReliabilityControls routes={ttcSurfaceRoutes} routeId={routeId} range={range} metric={metric} onRouteChange={setRouteId} onRangeChange={setRange} onMetricChange={setMetric} />
      </header>
      {metric !== 'headway' && <p className="reliability-selection-note">{metric === 'on-time' ? 'On-time performance' : metric === 'bunching' ? 'Bunching' : 'Service-gap'} analysis is not yet available. Observed headway bounds remain shown below.</p>}
      <HeadwayAnalysis routeId={routeId} />
    </section>
  )
}
