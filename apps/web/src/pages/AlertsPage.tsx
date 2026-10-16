import { useEffect, useMemo, useState } from 'react'
import { AlertFilters } from '@/features/alerts/components/AlertFilters'
import { AlertInvestigationPanel } from '@/features/alerts/components/AlertInvestigationPanel'
import { AlertTimeline } from '@/features/alerts/components/AlertTimeline'
import { ttcSurfaceRoutes } from '@/features/network/data/ttcSurfaceRoutes'
import { useServiceAlerts } from '@/features/alerts/api/alerts'

export function AlertsPage() {
  const [routeId, setRouteId] = useState('all')
  const [query, setQuery] = useState('')
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null)
  const alertsQuery = useServiceAlerts(routeId)
  const visibleAlerts = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    const alerts = alertsQuery.data?.alerts ?? []
    if (!normalized) return alerts
    return alerts.filter((alert) => [alert.title, alert.description, ...alert.affectedRouteIds]
      .some((value) => value?.toLocaleLowerCase().includes(normalized)))
  }, [alertsQuery.data, query])
  const selectedAlert = visibleAlerts.find(({ alertId }) => alertId === selectedAlertId) ?? null

  useEffect(() => {
    if (selectedAlertId && !visibleAlerts.some(({ alertId }) => alertId === selectedAlertId)) setSelectedAlertId(null)
  }, [selectedAlertId, visibleAlerts])

  const timelineState = alertsQuery.isPending ? 'loading'
    : alertsQuery.isError ? 'unavailable'
      : alertsQuery.data?.status === 'empty' ? 'empty'
        : visibleAlerts.length ? 'available' : 'no-match'
  const feedStatus = alertsQuery.isPending ? 'CONNECTING TO FEED'
    : alertsQuery.isError ? 'FEED TEMPORARILY UNAVAILABLE'
      : alertsQuery.data?.status === 'empty' ? 'NO REPORTED ALERTS'
        : `${alertsQuery.data?.totalAlertCount ?? 0} CURRENT ALERTS`

  return (
    <section className="alerts-page" aria-label="Transit service disruption investigation workspace">
      <header className="alerts-header">
        <div><span>SERVICE ALERTS</span><h1>TTC / TORONTO</h1></div>
        <span className="alerts-feed-status" data-unavailable={alertsQuery.isError}>{feedStatus}</span>
        <AlertFilters routeId={routeId} query={query} routes={ttcSurfaceRoutes} onRouteChange={setRouteId} onQueryChange={setQuery} />
      </header>
      <div className="alerts-workspace">
        <AlertTimeline alerts={visibleAlerts} selectedAlertId={selectedAlertId} state={timelineState} response={alertsQuery.data} onSelect={setSelectedAlertId} />
        <AlertInvestigationPanel alert={selectedAlert} response={alertsQuery.data} />
      </div>
    </section>
  )
}
