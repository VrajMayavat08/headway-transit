import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { getRouteDisplayColor, routeDisplayColorExpression } from '@/features/network/data/routeDisplayColors'
import { ttcSurfaceRouteCollection } from '@/features/network/data/ttcSurfaceRoutes'
import { ttcSurfaceStopCollection } from '@/features/network/data/ttcSurfaceStops'

const toronto: [number, number] = [-79.3832, 43.6532]
const darkBasemapStyle = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
// Geographic colors are MapLibre paint properties, intentionally separate from CSS chrome tokens.
const basemapPalette = {
  background: '#0b1212',
  land: '#101817',
  landcover: '#13201f',
  park: '#152522',
  building: '#14201f',
  water: '#071c20',
  waterway: '#24403e',
  boundary: '#24403e',
  minorRoad: '#1c2928',
  secondaryRoad: '#263331',
  majorRoad: '#34413e',
  primaryLabel: '#c8cbc4',
  secondaryLabel: '#7f8d89',
}

type NetworkMapProps = {
  onMapReady?: (map: maplibregl.Map | null) => void
  selectedRouteId: string | null
  onRouteSelect: (routeId: string) => void
  selectedStopId: string | null
  onStopSelect: (stopId: string) => void
}

function applyHeadwayBasemapPalette(map: maplibregl.Map) {
  for (const layer of map.getStyle().layers ?? []) {
    const name = layer.id.toLowerCase()

    if (layer.type === 'background') {
      map.setPaintProperty(layer.id, 'background-color', basemapPalette.background)
    }

    if (layer.type === 'fill') {
      const color = name.includes('water')
        ? basemapPalette.water
        : name.includes('park') || name.includes('national') || name.includes('nature')
          ? basemapPalette.park
          : name.includes('landcover')
            ? basemapPalette.landcover
          : name.includes('building')
            ? basemapPalette.building
            : basemapPalette.land
      map.setPaintProperty(layer.id, 'fill-color', color)
    }

    if (layer.type === 'fill-extrusion') {
      map.setPaintProperty(layer.id, 'fill-extrusion-color', basemapPalette.building)
    }

    if (layer.type === 'line') {
      const color = name.includes('water')
        ? basemapPalette.waterway
        : name.includes('boundary')
          ? basemapPalette.boundary
          : name.includes('mot') || name.includes('trunk') || name.includes('pri')
            ? basemapPalette.majorRoad
            : name.includes('sec')
              ? basemapPalette.secondaryRoad
              : name.includes('road') || name.includes('service') || name.includes('minor') || name.includes('rail')
                ? basemapPalette.minorRoad
                : basemapPalette.boundary
      map.setPaintProperty(layer.id, 'line-color', color)
    }

    if (layer.type === 'symbol') {
      const isPrimaryLabel = name.includes('city') || name.includes('place') || name.includes('country')
      map.setPaintProperty(layer.id, 'text-color', isPrimaryLabel ? basemapPalette.primaryLabel : basemapPalette.secondaryLabel)
      map.setPaintProperty(layer.id, 'icon-color', basemapPalette.secondaryLabel)
    }
  }
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
    filter: ['==', ['geometry-type'], 'LineString'],
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
    filter: ['==', ['geometry-type'], 'LineString'],
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
    map.setPaintProperty('ttc-surface-observed-network', 'line-opacity', 1)
    map.setPaintProperty('ttc-surface-observed-network', 'line-width', 3.25)
    map.setPaintProperty('ttc-surface-shadow-network', 'line-opacity', 0.28)
    map.setPaintProperty('ttc-surface-route-labels', 'text-opacity', 1)
  } else {
    const selected = ['==', ['get', 'routeId'], selectedRouteId]
    const selectedStopRoute = ['in', selectedRouteId, ['get', 'routeIds']]
    const selectedStopOpacity = ['interpolate', ['linear'], ['zoom'], 10, 0, 10.6, 0.42, 12, 0.7, 14, 0.9]
    const unselectedStopOpacity = ['interpolate', ['linear'], ['zoom'], 10, 0, 11, 0.04, 12, 0.15, 14, 0.28]
    map.setPaintProperty('ttc-surface-observed-network', 'line-opacity', ['case', selected, 1, 0.26] as never)
    map.setPaintProperty('ttc-surface-observed-network', 'line-width', ['case', selected, 4.5, 2.6] as never)
    map.setPaintProperty('ttc-surface-shadow-network', 'line-opacity', ['case', selected, 0.38, 0.12] as never)
    map.setPaintProperty('ttc-surface-route-labels', 'text-opacity', ['case', selected, 1, 0.38] as never)
    map.setPaintProperty('ttc-surface-stops', 'circle-color', ['case', selectedStopRoute, getRouteDisplayColor(selectedRouteId), '#899692'] as never)
    map.setPaintProperty('ttc-surface-stops', 'circle-opacity', ['case', selectedStopRoute, selectedStopOpacity, unselectedStopOpacity] as never)
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

    const map = new maplibregl.Map({
      container,
      style: darkBasemapStyle,
      center: toronto,
      zoom: 10.6,
      bearing: 0,
      pitch: 0,
      attributionControl: false,
      interactive: true,
      renderWorldCopies: false,
    })
    mapRef.current = map
    onMapReady?.(map)

    map.once('style.load', () => {
      applyHeadwayBasemapPalette(map)
      addTtcSurfaceRouteLayers(map)
      applyRouteSelection(map, selectedRouteIdRef.current, selectedStopIdRef.current)

      map.on('mouseenter', 'ttc-surface-route-hit-area', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'ttc-surface-route-hit-area', () => { map.getCanvas().style.cursor = '' })
      map.on('click', 'ttc-surface-route-hit-area', (event) => {
        const routeId = event.features?.[0]?.properties?.routeId
        if (typeof routeId === 'string') onRouteSelectRef.current(routeId)
      })
      map.on('mouseenter', 'ttc-surface-stops', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'ttc-surface-stops', () => { map.getCanvas().style.cursor = '' })
      map.on('click', 'ttc-surface-stops', (event) => {
        const stopId = event.features?.[0]?.properties?.stopId
        if (typeof stopId === 'string') onStopSelectRef.current(stopId)
      })
    })

    return () => {
      mapRef.current = null
      onMapReady?.(null)
      map.remove()
    }
  }, [onMapReady])

  return <div ref={mapContainer} className="network-map" aria-label="Toronto basemap" />
}
