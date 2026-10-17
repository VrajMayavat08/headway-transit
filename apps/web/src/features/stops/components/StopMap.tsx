import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { TtcSurfaceStop } from '@/features/network/data/ttcSurfaceStops'
import type { StopServingGeometry } from '@/features/stops/api/stopGeometry'
import { stopMapLegendEntries, stopMapRouteColorExpression } from '@/features/stops/lib/stopMapPresentation'
import { applyHeadwayBasemapPalette, darkBasemapStyle } from '@/features/network/lib/mapStyle'

type StopMapProps = {
  stop: TtcSurfaceStop | null
  geometry: StopServingGeometry | undefined
  isLoading: boolean
  isError: boolean
}

const emptyGeometry: StopServingGeometry = { type: 'FeatureCollection', features: [] }

function stopFeatureCollection(stop: TtcSurfaceStop | null) {
  return {
    type: 'FeatureCollection' as const,
    features: stop ? [{
      type: 'Feature' as const,
      properties: { stopId: stop.stopId },
      geometry: { type: 'Point' as const, coordinates: [stop.stopLon, stop.stopLat] },
    }] : [],
  }
}

function focusStop(map: maplibregl.Map, stop: TtcSurfaceStop | null) {
  if (stop) map.jumpTo({ center: [stop.stopLon, stop.stopLat], zoom: 14 })
}

function syncStopMap(map: maplibregl.Map, stop: TtcSurfaceStop | null, geometry: StopServingGeometry | undefined) {
  const routeSource = map.getSource('stop-serving-routes') as maplibregl.GeoJSONSource | undefined
  const stopSource = map.getSource('selected-ttc-stop') as maplibregl.GeoJSONSource | undefined
  if (!routeSource || !stopSource) return

  routeSource.setData((geometry ?? emptyGeometry) as maplibregl.GeoJSONSourceSpecification['data'])
  stopSource.setData(stopFeatureCollection(stop) as maplibregl.GeoJSONSourceSpecification['data'])
  if (map.getLayer('stop-serving-routes')) {
    map.setPaintProperty('stop-serving-routes', 'line-color', stopMapRouteColorExpression(geometry ?? emptyGeometry) as never)
  }
  focusStop(map, stop)
}

export function StopMap({ stop, geometry, isLoading, isError }: StopMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const stopRef = useRef(stop)
  const geometryRef = useRef(geometry)
  stopRef.current = stop
  geometryRef.current = geometry

  useEffect(() => {
    const map = mapRef.current
    if (map) syncStopMap(map, stop, geometry)
  }, [stop, geometry])

  useEffect(() => {
    const container = mapContainer.current
    if (!container) return undefined
    const map = new maplibregl.Map({
      container,
      style: darkBasemapStyle,
      center: [-79.3832, 43.6532],
      zoom: 10.6,
      attributionControl: false,
      renderWorldCopies: false,
    })
    mapRef.current = map

    const resizeObserver = new ResizeObserver(() => map.resize())
    resizeObserver.observe(container)

    map.once('style.load', () => {
      applyHeadwayBasemapPalette(map)
      map.addSource('stop-serving-routes', { type: 'geojson', data: emptyGeometry as maplibregl.GeoJSONSourceSpecification['data'] })
      map.addLayer({
        id: 'stop-serving-routes-casing', type: 'line', source: 'stop-serving-routes',
        paint: { 'line-color': '#0b1212', 'line-opacity': 0.9, 'line-width': 5.5 },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      })
      map.addLayer({
        id: 'stop-serving-routes', type: 'line', source: 'stop-serving-routes',
        paint: { 'line-color': stopMapRouteColorExpression(emptyGeometry) as unknown as never, 'line-width': 3.25 },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      })
      map.addSource('selected-ttc-stop', { type: 'geojson', data: stopFeatureCollection(stopRef.current) as maplibregl.GeoJSONSourceSpecification['data'] })
      map.addLayer({
        id: 'selected-ttc-stop-halo', type: 'circle', source: 'selected-ttc-stop',
        paint: { 'circle-radius': 10, 'circle-color': '#0b1212', 'circle-opacity': 0.88 },
      })
      map.addLayer({
        id: 'selected-ttc-stop', type: 'circle', source: 'selected-ttc-stop',
        paint: { 'circle-radius': 6, 'circle-color': '#f1eee5', 'circle-stroke-width': 2.5, 'circle-stroke-color': '#0b1212' },
      })
      syncStopMap(map, stopRef.current, geometryRef.current)
    })

    return () => {
      resizeObserver.disconnect()
      mapRef.current = null
      map.remove()
    }
  }, [])

  const status = stop
    ? isLoading
      ? 'Loading scheduled geometry for this stop.'
      : isError
        ? 'Scheduled geometry is unavailable for this stop.'
        : geometry && geometry.features.length === 0
          ? 'No scheduled route geometry serves this stop.'
          : null
    : null
  const legendEntries = stopMapLegendEntries(geometry)

  return (
    <div className="stop-map">
      <div ref={mapContainer} className="stop-map-canvas" aria-label="Selected TTC stop map" />
      {legendEntries.length > 0 && (
        <aside className="stop-map-legend" aria-label="Map legend">
          <p className="stop-map-legend-title">SERVING SHAPES</p>
          <p className="stop-map-legend-note">COLOR IDENTIFIES ROUTE</p>
          <div className="stop-map-legend-stop"><span />SELECTED STOP</div>
          {legendEntries.map((entry) => (
            <div className="stop-map-legend-route" key={`${entry.routeId}:${entry.directionId ?? 'none'}:${entry.shapeId}`}>
              <span className="stop-map-legend-swatch" style={{ backgroundColor: entry.color }} />
              <div>
                <strong>{entry.routeShortName ?? entry.routeId} {entry.routeLongName ?? ''}</strong>
                <small>{entry.headsign || (entry.directionId === null ? 'No GTFS direction' : `GTFS direction ${entry.directionId}`)} · Shape {entry.shapeId}</small>
              </div>
            </div>
          ))}
        </aside>
      )}
      {status && <p className="stop-map-status">{status}</p>}
    </div>
  )
}
