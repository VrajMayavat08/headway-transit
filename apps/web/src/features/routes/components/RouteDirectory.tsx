import type { CSSProperties, ChangeEvent } from 'react'
import { getRouteDisplayColor } from '@/features/network/data/routeDisplayColors'
import type { ScheduleRoute } from '@/features/routes/api/routes'

type RouteDirectoryProps = {
  routes: ScheduleRoute[]
  selectedRouteId: string | null
  query: string
  isLoading: boolean
  isError: boolean
  onQueryChange: (query: string) => void
  onSelect: (routeId: string) => void
}

export function RouteDirectory({ routes, selectedRouteId, query, isLoading, isError, onQueryChange, onSelect }: RouteDirectoryProps) {
  return (
    <aside className="route-directory" aria-label="Route directory">
      <header className="route-directory-header">
        <span>ROUTES</span>
        <label className="route-search">
          <span className="visually-hidden">Search routes</span>
          <input
            type="search"
            value={query}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onQueryChange(event.target.value)}
            placeholder="Search routes"
          />
        </label>
      </header>
      <div className="route-directory-list">
        {!isLoading && !isError && routes.map((route) => {
          const selected = route.routeId === selectedRouteId
          const accent = getRouteDisplayColor(route.routeId)
          return (
            <button
              key={route.routeId}
              className="route-directory-item"
              data-selected={selected}
              style={{ '--route-accent': accent } as CSSProperties}
              type="button"
              onClick={() => onSelect(route.routeId)}
            >
              <strong>{route.shortName ?? route.routeId}</strong>
              <span>{route.longName ?? 'Unnamed route'}</span>
            </button>
          )
        })}
        {isLoading && <p className="route-directory-empty">Loading schedule routes.</p>}
        {isError && <p className="route-directory-empty">Route data is unavailable.</p>}
        {!isLoading && !isError && routes.length === 0 && <p className="route-directory-empty">No matching routes.</p>}
      </div>
    </aside>
  )
}
