import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { getRouteDisplayColor } from '@/features/network/data/routeDisplayColors'
import type { ScheduleRouteGeometry, ScheduleRouteStops } from '@/features/routes/api/routes'
import { applyHeadwayBasemapPalette, darkBasemapStyle } from '@/features/network/lib/mapStyle'
import { buildRouteStopFeatureCollection, createRouteStopLayerDefinitions } from '@/features/routes/lib/routeStopMapData'

type RouteMapProps = {
  routeId: string | null
  geometry: ScheduleRouteGeometry | undefined
  routeStops: ScheduleRouteStops | undefined
  isLoading: boolean
  isError: boolean
}

const emptyGeometry: ScheduleRouteGeometry = { type: 'FeatureCollection', features: [] }
const emptyStopCollection = { type: 'FeatureCollection' as const, features: [] }

type SelectedRouteStop = {
  stopIds: string[]
  stopNames: string[]
}

function geometrySourceData(geometry: ScheduleRouteGeometry | undefined) {
  return (geometry ?? emptyGeometry) as maplibregl.GeoJSONSourceSpecification['data']
}

function propertyStringList(value: unknown, fallback: string): string[] {
  if (typeof value !== 'string') return [fallback]
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string') && parsed.length > 0
      ? parsed
      : [fallback]
  } catch {
    return [fallback]
  }
}

function syncRouteMap(
  map: maplibregl.Map,
  routeId: string | null,
  geometry: ScheduleRouteGeometry | undefined,
  routeStops: ScheduleRouteStops | undefined,
) {
  const routeSource = map.getSource('selected-ttc-route') as maplibregl.GeoJSONSource | undefined
  const stopSource = map.getSource('selected-ttc-route-stops') as maplibregl.GeoJSONSource | undefined
  if (!routeSource || !stopSource || !map.getLayer('selected-ttc-route')) return

  routeSource.setData(geometrySourceData(geometry))
  stopSource.setData(buildRouteStopFeatureCollection(routeStops))
  map.setPaintProperty('selected-ttc-route', 'line-color', getRouteDisplayColor(routeId ?? ''))
  fitRoute(map, geometry)
}

function fitRoute(map: maplibregl.Map, geometry: ScheduleRouteGeometry | undefined) {
  const coordinates = geometry?.features.flatMap((feature) => feature.geometry.coordinates) ?? []
  if (!coordinates.length) return

  const bounds = coordinates.reduce(
    (current, coordinate) => current.extend(coordinate),
    new maplibregl.LngLatBounds(coordinates[0], coordinates[0]),
  )
  map.fitBounds(bounds, { padding: 52, maxZoom: 14, duration: 0 })
}

export function RouteMap({ routeId, geometry, routeStops, isLoading, isError }: RouteMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const routeIdRef = useRef(routeId)
  const geometryRef = useRef(geometry)
  const routeStopsRef = useRef(routeStops)
  const [selectedStop, setSelectedStop] = useState<SelectedRouteStop | null>(null)

  // Keep the style-load callback in sync even when the API responds before the map.
  routeIdRef.current = routeId
  geometryRef.current = geometry
  routeStopsRef.current = routeStops

  useEffect(() => { setSelectedStop(null) }, [routeId])

  useEffect(() => {
    const map = mapRef.current
    if (map) syncRouteMap(map, routeId, geometry, routeStops)
  }, [geometry, routeId, routeStops])

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
      map.addSource('selected-ttc-route', {
        type: 'geojson',
        data: emptyGeometry as maplibregl.GeoJSONSourceSpecification['data'],
      })
      map.addLayer({
        id: 'selected-ttc-route-shadow',
        type: 'line',
        source: 'selected-ttc-route',
        paint: {
          'line-color': '#a6adaa',
          'line-opacity': 0.28,
          'line-width': ['interpolate', ['linear'], ['zoom'], 9, 6, 12, 8, 15, 10] as never,
        },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      })
      map.addLayer({
        id: 'selected-ttc-route-casing',
        type: 'line',
        source: 'selected-ttc-route',
        paint: {
          'line-color': '#0b1212',
          'line-opacity': 0.92,
          'line-width': ['interpolate', ['linear'], ['zoom'], 9, 4.8, 12, 6.5, 15, 8.5] as never,
        },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      })
      map.addLayer({
        id: 'selected-ttc-route',
        type: 'line',
        source: 'selected-ttc-route',
        paint: {
          'line-color': getRouteDisplayColor(routeIdRef.current ?? ''),
          'line-width': ['interpolate', ['linear'], ['zoom'], 9, 3.2, 12, 4.5, 15, 6.2] as never,
        },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      })
      map.addSource('selected-ttc-route-stops', {
        type: 'geojson',
        data: emptyStopCollection,
      })
      for (const layer of createRouteStopLayerDefinitions()) {
        map.addLayer(layer as maplibregl.LayerSpecification)
      }
      syncRouteMap(map, routeIdRef.current, geometryRef.current, routeStopsRef.current)

      const setHoveredStop = (event: maplibregl.MapLayerMouseEvent) => {
        const stopId = event.features?.[0]?.properties?.stopId
        if (typeof stopId !== 'string') return
        map.getCanvas().style.cursor = 'pointer'
        map.setFilter('selected-ttc-route-stop-hover', ['==', ['get', 'stopId'], stopId])
      }
      const clearHoveredStop = () => {
        map.getCanvas().style.cursor = ''
        map.setFilter('selected-ttc-route-stop-hover', ['==', ['get', 'stopId'], ''])
      }
      const selectStop = (event: maplibregl.MapLayerMouseEvent) => {
        const feature = event.features?.[0]?.properties
        if (typeof feature?.stopId !== 'string') return
        setSelectedStop({
          stopIds: propertyStringList(feature.stopIds, feature.stopId),
          stopNames: propertyStringList(feature.stopNames, typeof feature.stopName === 'string' ? feature.stopName : feature.stopId),
        })
      }
      const interactiveStopLayers = ['selected-ttc-route-intermediate-stops', 'selected-ttc-route-terminals']
      for (const layerId of interactiveStopLayers) {
        map.on('mouseenter', layerId, setHoveredStop)
        map.on('mouseleave', layerId, clearHoveredStop)
        map.on('click', layerId, selectStop)
      }
    })

    return () => {
      resizeObserver.disconnect()
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
      {selectedStop && (
        <div className="route-map-stop-callout" role="status">
          <span>STOP</span>
          <strong title={selectedStop.stopNames.join(' / ')}>{selectedStop.stopNames.join(' / ')}</strong>
          <small title={selectedStop.stopIds.join(', ')}>ID {selectedStop.stopIds.join(', ')}</small>
        </div>
      )}
      {status && <p className="route-map-status">{status}</p>}
    </div>
  )
}
