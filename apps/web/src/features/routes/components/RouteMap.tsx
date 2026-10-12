import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { getRouteDisplayColor } from '@/features/network/data/routeDisplayColors'
import { getTtcSurfaceRouteGeometry, ttcSurfaceRouteCollection } from '@/features/network/data/ttcSurfaceRoutes'
import { applyHeadwayBasemapPalette, darkBasemapStyle } from '@/features/network/lib/mapStyle'

type RouteMapProps = { routeId: string | null }

function routeFeatureCollection(routeId: string | null) {
  return {
    type: 'FeatureCollection' as const,
    features: ttcSurfaceRouteCollection.features.filter(
      (feature) => feature.geometry.type === 'LineString' && feature.properties.routeId === routeId,
    ),
  }
}

function fitRoute(map: maplibregl.Map, routeId: string | null) {
  const coordinates = getTtcSurfaceRouteGeometry(routeId)
  if (!coordinates?.length) return

  const bounds = coordinates.reduce(
    (current, coordinate) => current.extend(coordinate as [number, number]),
    new maplibregl.LngLatBounds(coordinates[0] as [number, number], coordinates[0] as [number, number]),
  )
  map.fitBounds(bounds, { padding: 42, maxZoom: 14, duration: 0 })
}

export function RouteMap({ routeId }: RouteMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const routeIdRef = useRef(routeId)

  useEffect(() => { routeIdRef.current = routeId }, [routeId])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return
    const source = map.getSource('selected-ttc-route') as maplibregl.GeoJSONSource | undefined
    source?.setData(routeFeatureCollection(routeId) as maplibregl.GeoJSONSourceSpecification['data'])
    map.setPaintProperty('selected-ttc-route', 'line-color', getRouteDisplayColor(routeId ?? ''))
    fitRoute(map, routeId)
  }, [routeId])

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
        data: routeFeatureCollection(routeIdRef.current) as maplibregl.GeoJSONSourceSpecification['data'],
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
      fitRoute(map, routeIdRef.current)
    })

    return () => {
      mapRef.current = null
      map.remove()
    }
  }, [])

  return <div ref={mapContainer} className="route-map" aria-label="Selected TTC route map" />
}
