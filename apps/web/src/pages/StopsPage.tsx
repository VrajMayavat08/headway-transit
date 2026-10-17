import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { StopDetails } from '@/features/stops/components/StopDetails'
import { StopDirectory } from '@/features/stops/components/StopDirectory'
import { StopMap } from '@/features/stops/components/StopMap'
import { useStopServingGeometry } from '@/features/stops/api/stopGeometry'
import { getTtcSurfaceStop, ttcSurfaceStopCollection } from '@/features/network/data/ttcSurfaceStops'

const importedStops = ttcSurfaceStopCollection.features.map((feature) => feature.properties)

export function StopsPage() {
  const navigate = useNavigate({ from: '/stops' })
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const selectedStop = getTtcSurfaceStop(selectedStopId)
  const { data: stopGeometry, isPending: isGeometryLoading, isError: isGeometryError } = useStopServingGeometry(selectedStop?.stopId ?? null)
  const visibleStops = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    if (!normalizedQuery) return importedStops
    return importedStops.filter((stop) => (
      stop.stopName.toLocaleLowerCase().includes(normalizedQuery) || stop.stopId.includes(normalizedQuery)
    ))
  }, [query])

  return (
    <section className="stops-page" aria-label="Stop investigation workspace">
      <StopDirectory
        stops={visibleStops}
        selectedStopId={selectedStopId}
        query={query}
        onQueryChange={setQuery}
        onSelect={setSelectedStopId}
      />
      <StopDetails
        stop={selectedStop}
        onRouteSelect={(routeId) => navigate({ to: '/routes', search: { routeId } })}
      />
      <section className="stop-map-panel" aria-label="Selected stop geography">
        <StopMap
          stop={selectedStop}
          geometry={stopGeometry}
          isLoading={selectedStop !== null && isGeometryLoading}
          isError={selectedStop !== null && isGeometryError}
        />
      </section>
    </section>
  )
}
