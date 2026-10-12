import { useState } from 'react'
import { AlertFilters } from '@/features/alerts/components/AlertFilters'
import { AlertInvestigationPanel } from '@/features/alerts/components/AlertInvestigationPanel'
import { AlertTimeline } from '@/features/alerts/components/AlertTimeline'
import type { AlertLifecycleStatus, NormalizedAlertSeverity } from '@/features/alerts/types'
import { ttcSurfaceRoutes } from '@/features/network/data/ttcSurfaceRoutes'

export function AlertsPage() {
  const [status, setStatus] = useState<'all' | AlertLifecycleStatus>('active')
  const [severity, setSeverity] = useState<'all' | Exclude<NormalizedAlertSeverity, 'unknown'>>('all')
  const [routeId, setRouteId] = useState('all')
  const [query, setQuery] = useState('')

  return (
    <section className="alerts-page" aria-label="Transit service disruption investigation workspace">
      <header className="alerts-header">
        <div><span>SERVICE ALERTS</span><h1>TTC / TORONTO</h1></div>
        <span className="alerts-feed-status">FEED NOT CONNECTED</span>
        <AlertFilters status={status} severity={severity} routeId={routeId} query={query} routes={ttcSurfaceRoutes} onStatusChange={setStatus} onSeverityChange={setSeverity} onRouteChange={setRouteId} onQueryChange={setQuery} />
      </header>
      <div className="alerts-workspace"><AlertTimeline /><AlertInvestigationPanel /></div>
    </section>
  )
}
