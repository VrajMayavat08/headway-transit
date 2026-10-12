import type { ChangeEvent } from 'react'
import type { TtcSurfaceStop } from '@/features/network/data/ttcSurfaceStops'

type StopDirectoryProps = {
  stops: TtcSurfaceStop[]
  selectedStopId: string | null
  query: string
  onQueryChange: (query: string) => void
  onSelect: (stopId: string) => void
}

export function StopDirectory({ stops, selectedStopId, query, onQueryChange, onSelect }: StopDirectoryProps) {
  return (
    <aside className="stop-directory" aria-label="Imported TTC stop directory">
      <header className="stop-directory-header">
        <span>STOPS</span>
        <p>IMPORTED ROUTE COVERAGE</p>
        <label className="stop-search">
          <span className="visually-hidden">Search stops</span>
          <input
            type="search"
            value={query}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onQueryChange(event.target.value)}
            placeholder="Search stops"
          />
        </label>
      </header>
      <div className="stop-directory-list">
        {stops.map((stop) => (
          <button
            key={stop.stopId}
            className="stop-directory-item"
            data-selected={stop.stopId === selectedStopId}
            type="button"
            onClick={() => onSelect(stop.stopId)}
          >
            <strong>{stop.stopName}</strong>
            <span>{stop.stopId}</span>
          </button>
        ))}
        {stops.length === 0 && <p className="stop-directory-empty">No matching imported stops.</p>}
      </div>
    </aside>
  )
}
