import { Link } from '@tanstack/react-router'
import type { AlertsResponse, ServiceAlert } from '@/features/alerts/types'
import { formatLocalDateTime } from '@/lib/formatting/time'

function readable(value: string | null) {
  return value?.replaceAll('_', ' ') ?? 'Not supplied by source'
}

function period(alert: ServiceAlert) {
  if (!alert.activePeriods.length) return 'Not supplied by source'
  return alert.activePeriods.map(({ start, end }) => `${formatLocalDateTime(start, 'Open start')} — ${formatLocalDateTime(end, 'Open end')}`).join('; ')
}

export function AlertInvestigationPanel({ alert, response }: { alert: ServiceAlert | null; response: AlertsResponse | undefined }) {
  if (!alert) return <aside className="alert-investigation-panel" aria-label="Alert investigation">
    <span>SELECT AN ALERT</span><p>Choose a service alert to inspect affected routes, stops, and timing.</p>
    <dl><div><dt>DESCRIPTION</dt><dd>Not selected</dd></div><div><dt>AFFECTED ROUTES</dt><dd>Not selected</dd></div><div><dt>AFFECTED STOPS</dt><dd>Not selected</dd></div><div><dt>ACTIVE PERIOD</dt><dd>Not selected</dd></div><div><dt>SOURCE</dt><dd>{response?.source.name ?? 'TTC official feed'}</dd></div></dl>
  </aside>

  return <aside className="alert-investigation-panel" aria-label="Alert investigation">
    <span>SERVICE ALERT</span><h2>{alert.title ?? 'TITLE NOT PROVIDED'}</h2><p>{alert.description ?? 'Description not supplied by the TTC feed.'}</p>
    <dl>
      <div><dt>EFFECT</dt><dd>{readable(alert.effect)}</dd></div>
      <div><dt>CAUSE</dt><dd>{readable(alert.cause)}</dd></div>
      <div><dt>SEVERITY</dt><dd>{alert.severity ?? 'Not supplied by source'}</dd></div>
      <div><dt>AFFECTED ROUTES</dt><dd>{alert.affectedRouteIds.length ? <span className="alert-route-links">{alert.affectedRouteIds.map((routeId) => <Link key={routeId} to="/routes" search={{ routeId }}>{routeId}</Link>)}</span> : 'Not supplied / system-wide'}</dd></div>
      <div><dt>AFFECTED STOPS</dt><dd>{alert.affectedStopIds.length ? alert.affectedStopIds.join(', ') : 'Not supplied'}</dd></div>
      <div><dt>ACTIVE PERIOD</dt><dd>{period(alert)}</dd></div>
      <div><dt>SOURCE</dt><dd>{alert.source}<br />{response?.source.attribution}</dd></div>
    </dl>
  </aside>
}
