import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { routeDisplayColorExpression } from '@/features/network/data/routeDisplayColors'
import { ttcSurfaceRouteCollection } from '@/features/network/data/ttcSurfaceRoutes'
import { applyHeadwayBasemapPalette, createHeadwayTorontoMap } from '@/features/network/lib/mapStyle'

type PlaybackMapProps = { routeId: string }

function routeFeatureCollection(routeId: string) {
  return {
    type: 'FeatureCollection' as const,
    features: ttcSurfaceRouteCollection.features.filter((feature) => (
      feature.geometry.type === 'LineString' && (routeId === 'all' || feature.properties.routeId === routeId)
    )),
  }
}

export function PlaybackMap({ routeId }: PlaybackMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const routeIdRef = useRef(routeId)
  useEffect(() => { routeIdRef.current = routeId }, [routeId])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return
    ;(map.getSource('playback-ttc-routes') as maplibregl.GeoJSONSource | undefined)?.setData(routeFeatureCollection(routeId) as maplibregl.GeoJSONSourceSpecification['data'])
    map.setPaintProperty('playback-ttc-routes', 'line-opacity', routeId === 'all' ? 0.92 : 1)
  }, [routeId])

  useEffect(() => {
    const container = mapContainer.current
    if (!container) return undefined
    const map = createHeadwayTorontoMap(container)
    mapRef.current = map

    map.once('style.load', () => {
      applyHeadwayBasemapPalette(map)
      map.addSource('playback-ttc-routes', { type: 'geojson', data: routeFeatureCollection(routeIdRef.current) as maplibregl.GeoJSONSourceSpecification['data'] })
      map.addLayer({ id: 'playback-ttc-route-shadow', type: 'line', source: 'playback-ttc-routes', paint: { 'line-color': '#a6adaa', 'line-opacity': 0.25, 'line-width': 5.5 }, layout: { 'line-cap': 'round', 'line-join': 'round' } })
      map.addLayer({ id: 'playback-ttc-routes', type: 'line', source: 'playback-ttc-routes', paint: { 'line-color': routeDisplayColorExpression as unknown as never, 'line-opacity': routeIdRef.current === 'all' ? 0.92 : 1, 'line-width': 3.25 }, layout: { 'line-cap': 'round', 'line-join': 'round' } })
    })

    return () => { mapRef.current = null; map.remove() }
  }, [])

  return <div ref={mapContainer} className="playback-map" aria-label="Toronto historical playback map" />
}
