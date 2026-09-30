import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { prototypeRouteCollection } from '@/features/network/data/prototypeRoutes'

const toronto: [number, number] = [-79.3832, 43.6532]
const darkBasemapStyle = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

function applyHeadwayBasemapPalette(map: maplibregl.Map) {
  for (const layer of map.getStyle().layers ?? []) {
    const name = layer.id.toLowerCase()

    if (layer.type === 'background') {
      map.setPaintProperty(layer.id, 'background-color', '#0d1515')
    }

    if (layer.type === 'fill') {
      const color = name.includes('water')
        ? '#071c20'
        : name.includes('park') || name.includes('landcover') || name.includes('landuse')
          ? '#152522'
          : name.includes('building')
            ? '#14201f'
            : '#101817'
      map.setPaintProperty(layer.id, 'fill-color', color)
    }

    if (layer.type === 'fill-extrusion') {
      map.setPaintProperty(layer.id, 'fill-extrusion-color', '#14201f')
    }

    if (layer.type === 'line') {
      const color = name.includes('water')
        ? '#24403e'
        : name.includes('boundary')
          ? '#24403e'
          : name.includes('motorway') || name.includes('trunk') || name.includes('primary')
            ? '#34413e'
            : name.includes('secondary')
              ? '#263331'
              : name.includes('road') || name.includes('street') || name.includes('tertiary') || name.includes('rail')
                ? '#1c2928'
                : '#24403e'
      map.setPaintProperty(layer.id, 'line-color', color)
    }

    if (layer.type === 'symbol') {
      const isPrimaryLabel = name.includes('city') || name.includes('place') || name.includes('country')
      map.setPaintProperty(layer.id, 'text-color', isPrimaryLabel ? '#c8cbc4' : '#7f8d89')
      map.setPaintProperty(layer.id, 'icon-color', '#7f8d89')
    }
  }
}

function addPrototypeRouteLayers(map: maplibregl.Map) {
  const firstLabelLayer = map.getStyle().layers?.find((layer) => layer.type === 'symbol')?.id

  map.addSource('prototype-transit-routes', {
    type: 'geojson',
    data: prototypeRouteCollection,
  })

  map.addLayer({
    id: 'prototype-transit-shadow-network',
    type: 'line',
    source: 'prototype-transit-routes',
    paint: {
      'line-color': '#a6adaa',
      'line-opacity': 0.28,
      'line-width': 5.5,
    },
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
  }, firstLabelLayer)

  map.addLayer({
    id: 'prototype-transit-observed-network',
    type: 'line',
    source: 'prototype-transit-routes',
    paint: {
      'line-color': ['get', 'color'],
      'line-width': 3.25,
    },
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
  }, firstLabelLayer)
}

export function NetworkMap() {
  const mapContainer = useRef<HTMLDivElement>(null)

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
      interactive: false,
      renderWorldCopies: false,
    })

    map.once('style.load', () => {
      applyHeadwayBasemapPalette(map)
      addPrototypeRouteLayers(map)
    })

    return () => map.remove()
  }, [])

  return <div ref={mapContainer} className="network-map" aria-label="Toronto basemap" />
}
