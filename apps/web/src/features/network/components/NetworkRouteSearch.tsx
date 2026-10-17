import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Search, X } from 'lucide-react'
import { fetchScheduleRoutes, scheduleRoutesQueryKey } from '@/features/routes/api/routes'
import { ttcSurfaceRoutes } from '@/features/network/data/ttcSurfaceRoutes'
import { filterNetworkRoutes, nextNetworkSearchIndex } from '@/features/network/lib/routeSearch'

const networkRouteIds = new Set(ttcSurfaceRoutes.map((route) => route.routeId))

export function NetworkRouteSearch() {
  const navigate = useNavigate({ from: '/network' })
  const { routeId: selectedRouteId } = useSearch({ from: '/network' })
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const { data: routes = [], isPending, isError } = useQuery({
    queryKey: scheduleRoutesQueryKey,
    queryFn: ({ signal }) => fetchScheduleRoutes(signal),
  })
  const results = useMemo(() => filterNetworkRoutes(routes, query, networkRouteIds), [query, routes])

  const selectRoute = (routeId: string) => {
    navigate({ search: { routeId }, replace: true })
    setQuery('')
    setActiveIndex(-1)
    setIsOpen(false)
  }

  const clear = () => {
    navigate({ search: { routeId: undefined }, replace: true })
    setQuery('')
    setActiveIndex(-1)
    setIsOpen(false)
  }

  return (
    <div className="network-top-search-wrap" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false)
    }}>
      <div className="network-top-search" role="combobox" aria-expanded={isOpen} aria-controls="network-route-search-results" aria-haspopup="listbox">
        <Search size={15} strokeWidth={1.5} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value)
            setActiveIndex(-1)
            setIsOpen(true)
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault()
              setIsOpen(true)
              const direction = event.key as 'ArrowDown' | 'ArrowUp'
              setActiveIndex((index) => nextNetworkSearchIndex(index, results.length, direction))
              return
            }
            if (event.key === 'Enter') {
              const result = results[activeIndex] ?? (results.length === 1 ? results[0] : undefined)
              if (result) {
                event.preventDefault()
                selectRoute(result.routeId)
              }
              return
            }
            if (event.key === 'Escape') {
              event.preventDefault()
              setIsOpen(false)
              setActiveIndex(-1)
            }
          }}
          placeholder="Search featured TTC routes"
          aria-label="Search featured TTC routes"
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `network-route-search-result-${activeIndex}` : undefined}
        />
        {(query || selectedRouteId) && <button type="button" onClick={clear} aria-label="Clear route search and selection"><X size={14} strokeWidth={1.7} aria-hidden="true" /></button>}
      </div>
      {isOpen && (
        <div id="network-route-search-results" className="network-route-search-results" role="listbox" aria-label="Matching TTC routes">
          {isPending && <p>Loading route directory.</p>}
          {isError && <p>Route directory is unavailable.</p>}
          {!isPending && !isError && results.map((route, index) => (
            <button
              id={`network-route-search-result-${index}`}
              key={route.routeId}
              type="button"
              role="option"
              aria-selected={route.routeId === selectedRouteId}
              data-active={index === activeIndex}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectRoute(route.routeId)}
            >
              <strong>{route.shortName ?? route.routeId}</strong>
              <span>{route.longName ?? 'Unnamed route'}</span>
            </button>
          ))}
          {!isPending && !isError && results.length === 0 && <p>No featured TTC routes match.</p>}
        </div>
      )}
    </div>
  )
}
