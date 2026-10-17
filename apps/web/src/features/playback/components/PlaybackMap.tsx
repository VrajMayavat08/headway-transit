import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { getRouteDisplayColor, routeDisplayColorExpression } from '@/features/network/data/routeDisplayColors'
import type { HistoricalVehicle } from '@/features/playback/api/vehicles'
import { ttcSurfaceRouteCollection } from '@/features/network/data/ttcSurfaceRoutes'
import { applyHeadwayBasemapPalette, createHeadwayTorontoMap } from '@/features/network/lib/mapStyle'

type PlaybackMapProps = { routeId: string; vehicles: HistoricalVehicle[] }

function vehicleCollection(vehicles: HistoricalVehicle[]) {
  return {
    type: 'FeatureCollection' as const,
    features: vehicles.map((vehicle) => ({
      type: 'Feature' as const,
      properties: { vehicleId: vehicle.vehicleId, reportedRouteId: vehicle.reportedRouteId, sourceTimestamp: vehicle.sourceTimestamp, color: getRouteDisplayColor(vehicle.reportedRouteId ?? '') },
      geometry: { type: 'Point' as const, coordinates: [vehicle.longitude, vehicle.latitude] },
    })),
  }
}

function routeFeatureCollection(routeId: string) {
  return {
    type: 'FeatureCollection' as const,
    features: ttcSurfaceRouteCollection.features.filter((feature) => (
      feature.geometry.type === 'LineString' && (routeId === 'all' || feature.properties.routeId === routeId)
    )),
  }
}

export function PlaybackMap({ routeId, vehicles }: PlaybackMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const routeIdRef = useRef(routeId)
  const vehiclesRef = useRef(vehicles)
  useEffect(() => { routeIdRef.current = routeId }, [routeId])
  useEffect(() => {
    vehiclesRef.current = vehicles
    ;(mapRef.current?.getSource('playback-vehicles') as maplibregl.GeoJSONSource | undefined)?.setData(vehicleCollection(vehicles))
  }, [vehicles])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.getSource('playback-ttc-routes')) return
    ;(map.getSource('playback-ttc-routes') as maplibregl.GeoJSONSource | undefined)?.setData(routeFeatureCollection(routeId) as maplibregl.GeoJSONSourceSpecification['data'])
    map.setPaintProperty('playback-ttc-routes', 'line-opacity', routeId === 'all' ? 0.92 : 1)
  }, [routeId])

  useEffect(() => {
    const container = mapContainer.current
    if (!container) return undefined
    const map = createHeadwayTorontoMap(container)
    mapRef.current = map
    const resizeObserver = new ResizeObserver(() => map.resize())
    resizeObserver.observe(container)

    map.once('style.load', () => {
      applyHeadwayBasemapPalette(map)
      map.addSource('playback-ttc-routes', { type: 'geojson', data: routeFeatureCollection(routeIdRef.current) as maplibregl.GeoJSONSourceSpecification['data'] })
      map.addLayer({ id: 'playback-ttc-route-shadow', type: 'line', source: 'playback-ttc-routes', paint: { 'line-color': '#a6adaa', 'line-opacity': 0.25, 'line-width': 5.5 }, layout: { 'line-cap': 'round', 'line-join': 'round' } })
      map.addLayer({ id: 'playback-ttc-routes', type: 'line', source: 'playback-ttc-routes', paint: { 'line-color': routeDisplayColorExpression as unknown as never, 'line-opacity': routeIdRef.current === 'all' ? 0.92 : 1, 'line-width': 3.25 }, layout: { 'line-cap': 'round', 'line-join': 'round' } })
      map.addSource('playback-vehicles', { type: 'geojson', data: vehicleCollection(vehiclesRef.current) })
      map.addLayer({ id: 'playback-vehicle-halo', type: 'circle', source: 'playback-vehicles', paint: {
        'circle-color': '#0b1212', 'circle-opacity': 0.82,
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 4.5, 13, 6.5],
      } })
      map.addLayer({ id: 'playback-vehicles', type: 'circle', source: 'playback-vehicles', paint: {
        'circle-color': ['get', 'color'], 'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 2.8, 13, 4.2], 'circle-stroke-width': 1, 'circle-stroke-color': '#f1eee5',
      } })
    })

    return () => { resizeObserver.disconnect(); mapRef.current = null; map.remove() }
  }, [])

  return <div ref={mapContainer} className="playback-map" aria-label="Toronto historical playback map" />
}
