import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { getRouteDisplayColor, routeDisplayColorExpression } from '@/features/network/data/routeDisplayColors'
import { ttcSurfaceRouteCollection } from '@/features/network/data/ttcSurfaceRoutes'
import { ttcSurfaceStopCollection } from '@/features/network/data/ttcSurfaceStops'
import { ttcSurfacePatternStopCollection } from '@/features/network/data/ttcSurfacePatternStops'
import { applyHeadwayBasemapPalette, createHeadwayTorontoMap } from '@/features/network/lib/mapStyle'
import { vehicleHitLayer } from './NetworkVehicles'

type NetworkMapProps = {
  onMapReady?: (map: maplibregl.Map | null) => void
  selectedRouteId: string | null
  onRouteSelect: (routeId: string) => void
  selectedStopId: string | null
  onStopSelect: (stopId: string) => void
}

function addTtcSurfaceRouteLayers(map: maplibregl.Map) {
  const firstLabelLayer = map.getStyle().layers?.find((layer) => layer.type === 'symbol')?.id
  const displayColorExpression = routeDisplayColorExpression as unknown as never

  map.addSource('ttc-surface-routes', {
    type: 'geojson',
    data: ttcSurfaceRouteCollection as maplibregl.GeoJSONSourceSpecification['data'],
  })

  map.addLayer({
    id: 'ttc-surface-shadow-network',
    type: 'line',
    source: 'ttc-surface-routes',
    paint: {
      'line-color': '#a6adaa',
      'line-opacity': 0.28,
      'line-width': 5.5,
    },
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
    filter: ['all', ['==', ['geometry-type'], 'LineString'], ['==', ['get', 'isPrimary'], true]],
  }, firstLabelLayer)

  map.addLayer({
    id: 'ttc-surface-observed-network',
    type: 'line',
    source: 'ttc-surface-routes',
    paint: {
      'line-color': displayColorExpression,
      'line-width': 3.25,
    },
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
    filter: ['all', ['==', ['geometry-type'], 'LineString'], ['==', ['get', 'isPrimary'], true]],
  }, firstLabelLayer)

  map.addLayer({
    id: 'ttc-surface-alternate-network',
    type: 'line',
    source: 'ttc-surface-routes',
    paint: {
      'line-color': displayColorExpression,
      'line-opacity': 0,
      'line-width': 2.25,
    },
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
    filter: ['all', ['==', ['geometry-type'], 'LineString'], ['==', ['get', 'isPrimary'], false]],
  }, firstLabelLayer)

  map.addLayer({
    id: 'ttc-surface-route-labels',
    type: 'symbol',
    source: 'ttc-surface-routes',
    layout: {
      'text-field': ['get', 'routeShortName'],
      'text-font': ['Noto Sans Regular'],
      'text-size': 11,
      'text-letter-spacing': 0.04,
      'text-allow-overlap': false,
    },
    paint: {
      'text-color': displayColorExpression,
      'text-halo-color': '#0b1212',
      'text-halo-width': 1,
    },
    filter: ['==', ['geometry-type'], 'Point'],
  })

  map.addLayer({
    id: 'ttc-surface-route-hit-area',
    type: 'line',
    source: 'ttc-surface-routes',
    paint: { 'line-color': '#000000', 'line-opacity': 0, 'line-width': 16 },
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    filter: ['==', ['geometry-type'], 'LineString'],
  })

  map.addSource('ttc-surface-stops', {
    type: 'geojson',
    data: ttcSurfaceStopCollection as maplibregl.GeoJSONSourceSpecification['data'],
  })

  map.addSource('ttc-surface-pattern-stops', {
    type: 'geojson',
    data: ttcSurfacePatternStopCollection as maplibregl.GeoJSONSourceSpecification['data'],
  })

  map.addLayer({
    id: 'ttc-surface-stops',
    type: 'circle',
    source: 'ttc-surface-stops',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 0, 10.8, 1, 12, 2.2, 14, 3.3],
      'circle-color': '#899692',
      'circle-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0, 10.8, 0.08, 12, 0.45, 14, 0.78],
      'circle-stroke-width': 0.7,
      'circle-stroke-color': '#0b1212',
      'circle-stroke-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0, 11, 0.3, 13, 0.8],
    },
  })

  map.addLayer({
    id: 'ttc-surface-selected-pattern-stops',
    type: 'circle',
    source: 'ttc-surface-pattern-stops',
    filter: ['==', ['get', 'routeId'], '__no-selected-route__'],
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 0, 10.6, 1.5, 12, 2.7, 14, 3.8],
      'circle-color': '#899692',
      'circle-opacity': 0,
      'circle-stroke-width': 0.8,
      'circle-stroke-color': '#0b1212',
      'circle-stroke-opacity': 0.9,
    },
  })

  map.addLayer({
    id: 'ttc-surface-selected-stop',
    type: 'circle',
    source: 'ttc-surface-stops',
    paint: {
      'circle-radius': 4.2,
      'circle-color': '#f1eee5',
      'circle-opacity': 0,
      'circle-stroke-width': 1.2,
      'circle-stroke-color': '#0b1212',
    },
  })
}

function applyRouteSelection(map: maplibregl.Map, selectedRouteId: string | null, selectedStopId: string | null) {
  if (!selectedRouteId) {
    map.setFilter('ttc-surface-stops', ['has', 'stopId'] as never)
    map.setPaintProperty('ttc-surface-observed-network', 'line-opacity', 1)
    map.setPaintProperty('ttc-surface-observed-network', 'line-width', 3.25)
    map.setPaintProperty('ttc-surface-shadow-network', 'line-opacity', 0.28)
    map.setPaintProperty('ttc-surface-route-labels', 'text-opacity', 1)
    map.setPaintProperty('ttc-surface-alternate-network', 'line-opacity', 0)
    map.setFilter('ttc-surface-alternate-network', ['all', ['==', ['geometry-type'], 'LineString'], ['==', ['get', 'isPrimary'], false]])
    map.setPaintProperty('ttc-surface-stops', 'circle-color', '#899692')
    map.setPaintProperty('ttc-surface-stops', 'circle-opacity', ['interpolate', ['linear'], ['zoom'], 10, 0, 10.8, 0.08, 12, 0.45, 14, 0.78] as never)
    map.setFilter('ttc-surface-selected-pattern-stops', ['==', ['get', 'routeId'], '__no-selected-route__'])
    map.setPaintProperty('ttc-surface-selected-pattern-stops', 'circle-opacity', 0)
  } else {
    const selected = ['==', ['get', 'routeId'], selectedRouteId]
    const selectedStopOpacity = ['interpolate', ['linear'], ['zoom'], 10, 0, 10.6, 0.42, 12, 0.7, 14, 0.9]
    // Route-wide stops can belong to undisplayed GTFS patterns. Hide them while
    // the selected pattern-associated stop source supplies the visible markers.
    map.setFilter('ttc-surface-stops', ['==', ['get', 'stopId'], '__no-selected-route-stop__'] as never)
    map.setPaintProperty('ttc-surface-observed-network', 'line-opacity', ['case', selected, 1, 0.26] as never)
    map.setPaintProperty('ttc-surface-observed-network', 'line-width', ['case', selected, 4.5, 2.6] as never)
    map.setPaintProperty('ttc-surface-shadow-network', 'line-opacity', ['case', selected, 0.38, 0.12] as never)
    map.setPaintProperty('ttc-surface-route-labels', 'text-opacity', ['case', selected, 1, 0.38] as never)
    map.setPaintProperty('ttc-surface-alternate-network', 'line-opacity', 0.56)
    map.setFilter('ttc-surface-alternate-network', ['all', ['==', ['geometry-type'], 'LineString'], ['==', ['get', 'isPrimary'], false], selected] as never)
    map.setPaintProperty('ttc-surface-stops', 'circle-opacity', 0)
    map.setFilter('ttc-surface-selected-pattern-stops', ['==', ['get', 'routeId'], selectedRouteId])
    map.setPaintProperty('ttc-surface-selected-pattern-stops', 'circle-color', getRouteDisplayColor(selectedRouteId))
    map.setPaintProperty('ttc-surface-selected-pattern-stops', 'circle-opacity', selectedStopOpacity as never)
  }

  map.setFilter('ttc-surface-selected-stop', selectedStopId ? ['==', ['get', 'stopId'], selectedStopId] : ['==', ['get', 'stopId'], ''])
  map.setPaintProperty('ttc-surface-selected-stop', 'circle-opacity', selectedStopId ? 1 : 0)
}

export function NetworkMap({ onMapReady, selectedRouteId, onRouteSelect, selectedStopId, onStopSelect }: NetworkMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const onRouteSelectRef = useRef(onRouteSelect)
  const onStopSelectRef = useRef(onStopSelect)
  const selectedRouteIdRef = useRef(selectedRouteId)
  const selectedStopIdRef = useRef(selectedStopId)

  useEffect(() => {
    onRouteSelectRef.current = onRouteSelect
  }, [onRouteSelect])

  useEffect(() => {
    onStopSelectRef.current = onStopSelect
  }, [onStopSelect])

  useEffect(() => {
    selectedRouteIdRef.current = selectedRouteId
    selectedStopIdRef.current = selectedStopId
    const map = mapRef.current
    if (map?.isStyleLoaded()) applyRouteSelection(map, selectedRouteId, selectedStopId)
  }, [selectedRouteId, selectedStopId])

  useEffect(() => {
    const container = mapContainer.current
    if (!container) return undefined

    const map = createHeadwayTorontoMap(container)
    mapRef.current = map
    onMapReady?.(map)

    map.once('style.load', () => {
      applyHeadwayBasemapPalette(map)
      addTtcSurfaceRouteLayers(map)
      applyRouteSelection(map, selectedRouteIdRef.current, selectedStopIdRef.current)

      map.on('mouseenter', 'ttc-surface-route-hit-area', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'ttc-surface-route-hit-area', () => { map.getCanvas().style.cursor = '' })
      map.on('click', 'ttc-surface-route-hit-area', (event) => {
        if (map.getLayer(vehicleHitLayer) && map.queryRenderedFeatures(event.point, { layers: [vehicleHitLayer] }).length) return
        const routeId = event.features?.[0]?.properties?.routeId
        if (typeof routeId === 'string') onRouteSelectRef.current(routeId)
      })
      const selectStop = (event: maplibregl.MapLayerMouseEvent) => {
        if (map.getLayer(vehicleHitLayer) && map.queryRenderedFeatures(event.point, { layers: [vehicleHitLayer] }).length) return
        const stopId = event.features?.[0]?.properties?.stopId
        if (typeof stopId === 'string') onStopSelectRef.current(stopId)
      }
      for (const layer of ['ttc-surface-stops', 'ttc-surface-selected-pattern-stops']) {
        map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = '' })
        map.on('click', layer, selectStop)
      }
    })

    return () => {
      mapRef.current = null
      onMapReady?.(null)
      map.remove()
    }
  }, [onMapReady])

  return <div ref={mapContainer} className="network-map" aria-label="Toronto basemap" />
}
