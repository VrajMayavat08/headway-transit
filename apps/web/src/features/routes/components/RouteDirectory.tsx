import type { CSSProperties, ChangeEvent } from 'react'
import type { TtcSurfaceRoute } from '@/features/network/data/ttcSurfaceRoutes'
import { getRouteDisplayColor } from '@/features/network/data/routeDisplayColors'

type RouteDirectoryProps = {
  routes: TtcSurfaceRoute[]
  selectedRouteId: string | null
  query: string
  onQueryChange: (query: string) => void
  onSelect: (routeId: string) => void
}

export function RouteDirectory({ routes, selectedRouteId, query, onQueryChange, onSelect }: RouteDirectoryProps) {
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
        {routes.map((route) => {
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
              <strong>{route.routeShortName}</strong>
              <span>{route.routeLongName}</span>
            </button>
          )
        })}
        {routes.length === 0 && <p className="route-directory-empty">No matching routes.</p>}
      </div>
    </aside>
  )
}
