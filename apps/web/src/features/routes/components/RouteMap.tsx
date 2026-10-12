import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { getRouteDisplayColor } from '@/features/network/data/routeDisplayColors'
import type { ScheduleRouteGeometry } from '@/features/routes/api/routes'
import { applyHeadwayBasemapPalette, darkBasemapStyle } from '@/features/network/lib/mapStyle'

type RouteMapProps = {
  routeId: string | null
  geometry: ScheduleRouteGeometry | undefined
  isLoading: boolean
  isError: boolean
}

const emptyGeometry: ScheduleRouteGeometry = { type: 'FeatureCollection', features: [] }

function geometrySourceData(geometry: ScheduleRouteGeometry | undefined) {
  return (geometry ?? emptyGeometry) as maplibregl.GeoJSONSourceSpecification['data']
}

function fitRoute(map: maplibregl.Map, geometry: ScheduleRouteGeometry | undefined) {
  const coordinates = geometry?.features.flatMap((feature) => feature.geometry.coordinates) ?? []
  if (!coordinates.length) return

  const bounds = coordinates.reduce(
    (current, coordinate) => current.extend(coordinate),
    new maplibregl.LngLatBounds(coordinates[0], coordinates[0]),
  )
  map.fitBounds(bounds, { padding: 42, maxZoom: 14, duration: 0 })
}

export function RouteMap({ routeId, geometry, isLoading, isError }: RouteMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const routeIdRef = useRef(routeId)
  const geometryRef = useRef(geometry)

  useEffect(() => { routeIdRef.current = routeId }, [routeId])
  useEffect(() => { geometryRef.current = geometry }, [geometry])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return
    const source = map.getSource('selected-ttc-route') as maplibregl.GeoJSONSource | undefined
    source?.setData(geometrySourceData(geometry))
    map.setPaintProperty('selected-ttc-route', 'line-color', getRouteDisplayColor(routeId ?? ''))
    fitRoute(map, geometry)
  }, [geometry, routeId])

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

    map.once('style.load', () => {
      applyHeadwayBasemapPalette(map)
      map.addSource('selected-ttc-route', {
        type: 'geojson',
        data: geometrySourceData(geometryRef.current),
      })
      map.addLayer({
        id: 'selected-ttc-route-shadow',
        type: 'line',
        source: 'selected-ttc-route',
        paint: { 'line-color': '#a6adaa', 'line-opacity': 0.3, 'line-width': 6 },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      })
      map.addLayer({
        id: 'selected-ttc-route',
        type: 'line',
        source: 'selected-ttc-route',
        paint: { 'line-color': getRouteDisplayColor(routeIdRef.current ?? ''), 'line-width': 3.5 },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      })
      fitRoute(map, geometryRef.current)
    })

    return () => {
      mapRef.current = null
      map.remove()
    }
  }, [])

  const status = isLoading
    ? 'Loading scheduled geometry.'
    : isError
      ? 'Route geometry is unavailable.'
      : geometry && geometry.features.length === 0
        ? 'No scheduled geometry is available for this route.'
        : null

  return (
    <div className="route-map">
      <div ref={mapContainer} className="route-map-canvas" aria-label="Selected TTC route map" />
      {status && <p className="route-map-status">{status}</p>}
    </div>
  )
}
