import { Compass, Minus, Plus, Search } from 'lucide-react'
import { NetworkMap } from '@/features/network/components/NetworkMap'

export function NetworkPage() {
  return (
    <section className="network-page" aria-label="Network workspace">
      <NetworkMap />

      <div className="network-status" aria-label="Operational status">
        <time dateTime="08:42:17">08:42:17</time>
        <span className="live-status"><span aria-hidden="true" />LIVE</span>
      </div>

      <div className="network-search" role="search" aria-label="Network search">
        <Search size={15} strokeWidth={1.5} aria-hidden="true" />
        <span>Search routes, stops, or vehicles…</span>
        <kbd>⌘ K</kbd>
      </div>

      <aside className="network-inspector-placeholder" aria-label="Reserved route inspector area" />

      <div className="network-map-controls" aria-label="Reserved map controls">
        <span className="network-compass"><Compass size={16} strokeWidth={1.4} aria-hidden="true" /></span>
        <span><Plus size={16} strokeWidth={1.5} aria-hidden="true" /></span>
        <span><Minus size={16} strokeWidth={1.5} aria-hidden="true" /></span>
      </div>

      <div className="network-playback-placeholder" aria-label="Reserved playback rail">
        <span className="playback-transport-placeholder" />
        <span className="playback-time-start">06:00</span>
        <span className="playback-track-placeholder"><i /></span>
        <span className="playback-time-end">12:00</span>
        <span className="playback-live-placeholder"><b aria-hidden="true" />Live</span>
      </div>
    </section>
  )
}
