import { useEffect, useState } from 'react'
import { PlaybackMap } from '@/features/playback/components/PlaybackMap'
import { PlaybackSessionPanel } from '@/features/playback/components/PlaybackSessionPanel'
import { PlaybackTimeline } from '@/features/playback/components/PlaybackTimeline'
import { usePlaybackVehicles, type HistoricalVehicle } from '@/features/playback/api/vehicles'
import { ttcSurfaceRoutes } from '@/features/network/data/ttcSurfaceRoutes'

const emptyVehicles: HistoricalVehicle[] = []
function localDateTime(value: string) {
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 19)
}

export function PlaybackPage() {
  const [requestedAt, setRequestedAt] = useState(() => new Date().toISOString())
  const [debouncedAt, setDebouncedAt] = useState(requestedAt)
  const [routeId, setRouteId] = useState('all')
  const [timeline, setTimeline] = useState<string[]>([])
  const query = usePlaybackVehicles(debouncedAt, routeId)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedAt(requestedAt), 180)
    return () => clearTimeout(timer)
  }, [requestedAt])
  useEffect(() => { if (query.data) setTimeline(query.data.timeline) }, [query.data])
  const loading = requestedAt !== debouncedAt || query.isFetching
  const data = requestedAt === debouncedAt && !query.isError ? query.data : undefined
  const status = loading ? 'Loading snapshot' : query.isError ? 'Request error'
    : data?.status === 'outside_retention' ? 'Outside retention window'
      : data?.status === 'available' ? 'Collected snapshot available' : 'No snapshot within 90 seconds'

  return <section className="playback-page" aria-label="Historical transit playback workspace">
    <PlaybackMap routeId={routeId} vehicles={data?.status === 'available' ? data.observations : emptyVehicles} />
    <header className="playback-header">
      <div><span>PLAYBACK</span><strong>HISTORICAL NETWORK</strong></div>
      <label><span>REQUESTED TIME (LOCAL)</span><input type="datetime-local" step="1" value={localDateTime(requestedAt)} onChange={(event) => {
        const value = new Date(event.target.value)
        if (Number.isFinite(value.getTime())) setRequestedAt(value.toISOString())
      }} /></label>
      <label><span>ROUTE FILTER</span><select value={routeId} onChange={(event) => setRouteId(event.target.value)}><option value="all">All recorded routes</option>{ttcSurfaceRoutes.map((route) => <option key={route.routeId} value={route.routeId}>{route.routeShortName} {route.routeLongName}</option>)}</select></label>
      <span className="playback-header-status" role="status">{status}</span>
    </header>
    <PlaybackSessionPanel data={data} requestedAt={requestedAt} status={status} />
    <PlaybackTimeline timeline={timeline} requestedAt={requestedAt} actualAt={data?.snapshot?.fetchedAt ?? null} onSeek={setRequestedAt} loading={loading} />
  </section>
}
