import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { TtcSurfaceStop } from '@/features/network/data/ttcSurfaceStops'
import { routeDisplayColorExpression } from '@/features/network/data/routeDisplayColors'
import { ttcSurfaceRouteCollection } from '@/features/network/data/ttcSurfaceRoutes'
import { applyHeadwayBasemapPalette, darkBasemapStyle } from '@/features/network/lib/mapStyle'

type StopMapProps = { stop: TtcSurfaceStop | null }

function routeFeatureCollection(stop: TtcSurfaceStop | null) {
  return {
    type: 'FeatureCollection' as const,
    features: ttcSurfaceRouteCollection.features.filter(
      (feature) => feature.geometry.type === 'LineString' && Boolean(stop?.routeIds.includes(feature.properties.routeId)),
    ),
  }
}

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

export function StopMap({ stop }: StopMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const stopRef = useRef(stop)
  useEffect(() => { stopRef.current = stop }, [stop])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return
    (map.getSource('stop-serving-routes') as maplibregl.GeoJSONSource | undefined)?.setData(routeFeatureCollection(stop) as maplibregl.GeoJSONSourceSpecification['data'])
    ;(map.getSource('selected-ttc-stop') as maplibregl.GeoJSONSource | undefined)?.setData(stopFeatureCollection(stop) as maplibregl.GeoJSONSourceSpecification['data'])
    focusStop(map, stop)
  }, [stop])

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
      map.addSource('stop-serving-routes', { type: 'geojson', data: routeFeatureCollection(stopRef.current) as maplibregl.GeoJSONSourceSpecification['data'] })
      map.addLayer({
        id: 'stop-serving-routes-shadow', type: 'line', source: 'stop-serving-routes',
        paint: { 'line-color': '#a6adaa', 'line-opacity': 0.28, 'line-width': 5.5 },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      })
      map.addLayer({
        id: 'stop-serving-routes', type: 'line', source: 'stop-serving-routes',
        paint: { 'line-color': routeDisplayColorExpression as unknown as never, 'line-width': 3.25 },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      })
      map.addSource('selected-ttc-stop', { type: 'geojson', data: stopFeatureCollection(stopRef.current) as maplibregl.GeoJSONSourceSpecification['data'] })
      map.addLayer({
        id: 'selected-ttc-stop', type: 'circle', source: 'selected-ttc-stop',
        paint: { 'circle-radius': 6, 'circle-color': '#f1eee5', 'circle-stroke-width': 2, 'circle-stroke-color': '#0b1212' },
      })
      focusStop(map, stopRef.current)
    })

    return () => { mapRef.current = null; map.remove() }
  }, [])

  return <div ref={mapContainer} className="stop-map" aria-label="Selected TTC stop map" />
}
