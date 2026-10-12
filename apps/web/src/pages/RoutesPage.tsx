import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearch } from '@tanstack/react-router'
import { RouteDetails } from '@/features/routes/components/RouteDetails'
import { RouteDirectory } from '@/features/routes/components/RouteDirectory'
import { RouteMap } from '@/features/routes/components/RouteMap'
import { useRouteGeometry } from '@/features/routes/api/useRouteGeometry'
import { useRouteStops } from '@/features/routes/api/useRouteStops'
import { fetchScheduleRoutes, scheduleRoutesQueryKey } from '@/features/routes/api/routes'
import { ttcSurfaceRoutes } from '@/features/network/data/ttcSurfaceRoutes'

export function RoutesPage() {
  const { routeId: requestedRouteId } = useSearch({ from: '/routes' })
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(requestedRouteId ?? ttcSurfaceRoutes[0]?.routeId ?? null)
  const [query, setQuery] = useState('')
  const { data: routes = [], isPending, isError } = useQuery({
    queryKey: scheduleRoutesQueryKey,
    queryFn: fetchScheduleRoutes,
  })

  useEffect(() => {
    if (requestedRouteId && routes.some((route) => route.routeId === requestedRouteId)) {
      setSelectedRouteId(requestedRouteId)
      return
    }

    if (!routes.length || routes.some((route) => route.routeId === selectedRouteId)) return
    setSelectedRouteId(routes.find((route) => route.routeId === ttcSurfaceRoutes[0]?.routeId)?.routeId ?? routes[0]?.routeId ?? null)
  }, [requestedRouteId, routes, selectedRouteId])

  const selectedRoute = routes.find((route) => route.routeId === selectedRouteId) ?? null
  const { data: routeStops, isPending: isStopsLoading, isError: isStopsError } = useRouteStops(selectedRoute?.routeId ?? null)
  const { data: routeGeometry, isPending: isGeometryLoading, isError: isGeometryError } = useRouteGeometry(selectedRoute?.routeId ?? null)
  const visibleRoutes = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    if (!normalizedQuery) return routes
    return routes.filter((route) => (
      (route.shortName ?? route.routeId).toLocaleLowerCase().includes(normalizedQuery)
      || (route.longName ?? '').toLocaleLowerCase().includes(normalizedQuery)
    ))
  }, [query, routes])

  return (
    <section className="routes-page" aria-label="Route investigation workspace">
      <RouteDirectory
        routes={visibleRoutes}
        selectedRouteId={selectedRouteId}
        query={query}
        isLoading={isPending}
        isError={isError}
        onQueryChange={setQuery}
        onSelect={setSelectedRouteId}
      />
      <RouteDetails
        route={selectedRoute}
        routeStops={routeStops}
        isStopsLoading={isStopsLoading}
        isStopsError={isStopsError}
      />
      <section className="route-map-panel" aria-label="Selected route geography">
        <RouteMap
          routeId={selectedRoute?.routeId ?? null}
          geometry={routeGeometry}
          isLoading={selectedRoute !== null && isGeometryLoading}
          isError={selectedRoute !== null && isGeometryError}
        />
      </section>
    </section>
  )
}
