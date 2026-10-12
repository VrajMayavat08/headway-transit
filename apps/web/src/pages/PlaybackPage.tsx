import { useState } from 'react'
import { PlaybackMap } from '@/features/playback/components/PlaybackMap'
import { PlaybackSessionPanel } from '@/features/playback/components/PlaybackSessionPanel'
import { PlaybackTimeline } from '@/features/playback/components/PlaybackTimeline'
import { getTtcSurfaceRoute, ttcSurfaceRoutes } from '@/features/network/data/ttcSurfaceRoutes'

function currentDate() { return new Date().toISOString().slice(0, 10) }

export function PlaybackPage() {
  const [date, setDate] = useState(currentDate)
  const [routeId, setRouteId] = useState('all')
  const [speed, setSpeed] = useState('1×')
  const selectedRoute = getTtcSurfaceRoute(routeId)

  return (
    <section className="playback-page" aria-label="Historical transit playback workspace">
      <PlaybackMap routeId={routeId} />
      <header className="playback-header">
        <div><span>PLAYBACK</span><strong>HISTORICAL NETWORK</strong></div>
        <label><span>DATE</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label><span>ROUTE FILTER</span><select value={routeId} onChange={(event) => setRouteId(event.target.value)}><option value="all">All imported routes</option>{ttcSurfaceRoutes.map((route) => <option key={route.routeId} value={route.routeId}>{route.routeShortName} {route.routeLongName}</option>)}</select></label>
        <span className="playback-header-status">NO RECORDED SESSIONS</span>
      </header>
      <PlaybackSessionPanel date={date} route={selectedRoute} />
      <PlaybackTimeline speed={speed} onSpeedChange={setSpeed} />
    </section>
  )
}
