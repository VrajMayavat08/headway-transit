import type { PlaybackResponse } from '@/features/playback/api/vehicles'

export function PlaybackSessionPanel({ data, requestedAt, status }: { data: PlaybackResponse | undefined; requestedAt: string; status: string }) {
  return <aside className="playback-session-panel" aria-label="Historical snapshot details">
    <header><span>COLLECTED SNAPSHOT</span><strong>{new Date(requestedAt).toLocaleDateString()}</strong></header>
    <dl>
      <div><dt>STATUS</dt><dd>{status}</dd></div>
      <div><dt>REQUESTED TIME</dt><dd>{new Date(requestedAt).toLocaleString()}</dd></div>
      <div><dt>ACTUAL COLLECTION</dt><dd>{data?.snapshot ? new Date(data.snapshot.fetchedAt).toLocaleString() : 'Not available'}</dd></div>
      <div><dt>FEED TIMESTAMP</dt><dd>{data?.snapshot?.feedTimestamp ? new Date(data.snapshot.feedTimestamp * 1000).toLocaleString() : 'Not available'}</dd></div>
      <div><dt>DISPLAYED POSITIONS</dt><dd>{data?.status === 'available' ? data.observations.length.toLocaleString() : 'Not available'}</dd></div>
    </dl>
    <p>Discrete collected positions. Movement between snapshots was not continuously observed. Per-vehicle source times may precede collection.</p>
    <p>Static route lines show the nine featured routes. Vehicles use their reported route IDs.</p>
    {data?.status === 'available' && data.observations.length === 0 && <p>No vehicles reporting this route in the selected snapshot.</p>}
    {data?.observationsTruncated && <p>Vehicle response limit reached; only the first 3,000 positions are shown.</p>}
    {data?.timelineTruncated && <p>The timeline shows the latest 2,000 collections.</p>}
  </aside>
}
