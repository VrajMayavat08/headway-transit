import type { TtcSurfaceRoute } from '@/features/network/data/ttcSurfaceRoutes'

type PlaybackSessionPanelProps = { date: string; route: TtcSurfaceRoute | null }

export function PlaybackSessionPanel({ date, route }: PlaybackSessionPanelProps) {
  return (
    <aside className="playback-session-panel" aria-label="Historical session details">
      <header><span>SESSION</span><strong>{date}</strong></header>
      <dl>
        <div><dt>STATUS</dt><dd>No recorded sessions</dd></div>
        <div><dt>OBSERVATION COVERAGE</dt><dd>Not available</dd></div>
        <div><dt>AVAILABLE ROUTES</dt><dd>{route ? `${route.routeShortName} static geometry` : 'Not available'}</dd></div>
        <div><dt>EVENT COUNT</dt><dd>—</dd></div>
      </dl>
      <p>Playback becomes available after the collector records historical vehicle observations.</p>
    </aside>
  )
}
