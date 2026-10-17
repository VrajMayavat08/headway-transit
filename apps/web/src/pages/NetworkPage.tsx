import { useCallback, useState } from 'react'
import type * as maplibregl from 'maplibre-gl'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Compass, Minus, Plus } from 'lucide-react'
import { NetworkMap } from '@/features/network/components/NetworkMap'
import { NetworkVehicles } from '@/features/network/components/NetworkVehicles'
import { RouteInspector } from '@/features/network/components/RouteInspector'
import { useRouteSelection } from '@/features/network/hooks/useRouteSelection'
import { getTtcSurfaceRoute } from '@/features/network/data/ttcSurfaceRoutes'

export function NetworkPage() {
  const [map, setMap] = useState<maplibregl.Map | null>(null)
  const { routeId } = useSearch({ from: '/network' })
  const navigate = useNavigate({ from: '/network' })
  const selectedRouteId = getTtcSurfaceRoute(routeId ?? null)?.routeId ?? null
  const setSelectedRouteId = useCallback((nextRouteId: string) => {
    navigate({ search: { routeId: nextRouteId }, replace: true })
  }, [navigate])
  const { selectedRoute, selectRoute, selectedStopId, selectedStop, selectStop } = useRouteSelection(selectedRouteId, setSelectedRouteId)

  return (
    <section className="network-page" aria-label="Network workspace">
      <NetworkMap onMapReady={setMap} selectedRouteId={selectedRouteId} onRouteSelect={selectRoute} selectedStopId={selectedStopId} onStopSelect={selectStop} />
      <NetworkVehicles map={map} selectedRouteId={selectedRouteId} />

      <aside className="network-inspector-placeholder" aria-label="Route inspector">
        <RouteInspector route={selectedRoute} selectedStopId={selectedStopId} />
      </aside>

      {selectedStop && (
        <aside className="stop-callout" aria-label="Selected stop">
          <strong>{selectedStop.stopName}</strong>
          <span>Routes: {selectedStop.routeShortNames.join(', ')}</span>
        </aside>
      )}

      <div className="network-map-controls" aria-label="Map controls">
        <button type="button" className="network-compass" onClick={() => map?.resetNorth()} disabled={!map} aria-label="Reset map bearing">
          <Compass size={16} strokeWidth={1.4} aria-hidden="true" />
        </button>
        <div className="network-zoom-controls">
          <button type="button" onClick={() => map?.zoomIn()} disabled={!map} aria-label="Zoom in"><Plus size={16} strokeWidth={1.5} aria-hidden="true" /></button>
          <button type="button" onClick={() => map?.zoomOut()} disabled={!map} aria-label="Zoom out"><Minus size={16} strokeWidth={1.5} aria-hidden="true" /></button>
        </div>
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
