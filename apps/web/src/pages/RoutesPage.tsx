import { useEffect, useMemo, useState } from 'react'
import { useSearch } from '@tanstack/react-router'
import { RouteDetails } from '@/features/routes/components/RouteDetails'
import { RouteDirectory } from '@/features/routes/components/RouteDirectory'
import { RouteMap } from '@/features/routes/components/RouteMap'
import { getTtcSurfaceRoute, ttcSurfaceRoutes } from '@/features/network/data/ttcSurfaceRoutes'
import { getTtcSurfaceRouteProfile } from '@/features/network/data/ttcSurfaceRouteProfiles'

export function RoutesPage() {
  const { routeId: requestedRouteId } = useSearch({ from: '/routes' })
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(requestedRouteId ?? ttcSurfaceRoutes[0]?.routeId ?? null)
  const [query, setQuery] = useState('')
  useEffect(() => {
    if (requestedRouteId && getTtcSurfaceRoute(requestedRouteId)) setSelectedRouteId(requestedRouteId)
  }, [requestedRouteId])
  const selectedRoute = getTtcSurfaceRoute(selectedRouteId)
  const selectedProfile = getTtcSurfaceRouteProfile(selectedRouteId)
  const visibleRoutes = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    if (!normalizedQuery) return ttcSurfaceRoutes
    return ttcSurfaceRoutes.filter((route) => (
      route.routeShortName.toLocaleLowerCase().includes(normalizedQuery)
      || route.routeLongName.toLocaleLowerCase().includes(normalizedQuery)
    ))
  }, [query])

  return (
    <section className="routes-page" aria-label="Route investigation workspace">
      <RouteDirectory
        routes={visibleRoutes}
        selectedRouteId={selectedRouteId}
        query={query}
        onQueryChange={setQuery}
        onSelect={setSelectedRouteId}
      />
      <RouteDetails route={selectedRoute} profile={selectedProfile} />
      <section className="route-map-panel" aria-label="Selected route geography">
        <RouteMap routeId={selectedRouteId} />
      </section>
    </section>
  )
}
