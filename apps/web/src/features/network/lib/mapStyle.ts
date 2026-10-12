import type * as maplibregl from 'maplibre-gl'
import * as maplibreglRuntime from 'maplibre-gl'

export const darkBasemapStyle = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

export function createHeadwayTorontoMap(container: HTMLElement) {
  return new maplibreglRuntime.Map({
    container,
    style: darkBasemapStyle,
    center: [-79.3832, 43.6532],
    zoom: 10.6,
    bearing: 0,
    pitch: 0,
    attributionControl: false,
    interactive: true,
    renderWorldCopies: false,
  })
}

// Geographic colors belong to MapLibre. Application chrome colors remain in CSS tokens.
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

export function applyHeadwayBasemapPalette(map: maplibregl.Map) {
  for (const layer of map.getStyle().layers ?? []) {
    const name = layer.id.toLowerCase()

    if (layer.type === 'background') map.setPaintProperty(layer.id, 'background-color', basemapPalette.background)

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

    if (layer.type === 'fill-extrusion') map.setPaintProperty(layer.id, 'fill-extrusion-color', basemapPalette.building)

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
