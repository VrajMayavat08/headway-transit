import type { AlertsResponse, ServiceAlert } from '@/features/alerts/types'

type AlertTimelineProps = {
  alerts: ServiceAlert[]
  selectedAlertId: string | null
  state: 'loading' | 'unavailable' | 'empty' | 'no-match' | 'available'
  response: AlertsResponse | undefined
  onSelect: (alertId: string) => void
}

function readable(value: string | null) {
  return value?.replaceAll('_', ' ') ?? 'Details not classified'
}

function formatTime(value: string | null) {
  if (!value) return 'Timestamp not supplied'
  return new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function AlertTimeline({ alerts, selectedAlertId, state, response, onSelect }: AlertTimelineProps) {
  const emptyCopy = {
    loading: ['LOADING OFFICIAL FEED', 'Requesting the current TTC service-alert dataset.'],
    unavailable: ['FEED TEMPORARILY UNAVAILABLE', 'Headway could not verify the current TTC alert feed. Previously loaded alerts are not presented as current.'],
    empty: ['NO REPORTED ALERTS', 'The current TTC feed returned no service-alert entities. This only describes the feed response at the recorded update time.'],
    'no-match': ['NO MATCHING ALERTS', 'No currently published alert matches these route and text filters.'],
  } as const

  return <section className="alert-timeline" aria-labelledby="alert-timeline-title">
    <header><span>CURRENT FEED</span><h1 id="alert-timeline-title">Service disruption activity</h1></header>
    {state !== 'available' ? <div className="alert-timeline-empty" role="status"><span aria-hidden="true" /><div><strong>{emptyCopy[state][0]}</strong><p>{emptyCopy[state][1]}</p></div></div> : (
      <div className="alert-list">
        {alerts.map((alert) => <button
          type="button"
          className="alert-list-item"
          data-selected={alert.alertId === selectedAlertId}
          key={alert.alertId}
          onClick={() => onSelect(alert.alertId)}
        >
          <span className="alert-list-marker" aria-hidden="true" />
          <span className="alert-list-copy">
            <strong>{alert.title ?? alert.description ?? 'TITLE NOT PROVIDED'}</strong>
            <small>{readable(alert.effect)} · {alert.affectedRouteIds.length ? `Routes ${alert.affectedRouteIds.join(', ')}` : 'System-wide / route not supplied'}</small>
          </span>
          <time dateTime={alert.lastUpdatedAt ?? undefined}>{formatTime(alert.lastUpdatedAt)}</time>
        </button>)}
      </div>
    )}
    {response && <footer className="alert-source-note"><span>{response.source.name}</span><span>Feed update {formatTime(response.feedTimestamp)}</span></footer>}
  </section>
}
