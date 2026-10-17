import { getRouteDisplayColor } from '@/features/network/data/routeDisplayColors'
import type { StopServingGeometry } from '@/features/stops/api/stopGeometry'

const defaultRouteColor = '#899692'
const additionalRouteColors = ['#8fa7b3', '#a695bb', '#b39b70', '#78a49b', '#b4838c', '#8e9f79']

export type StopMapLegendEntry = {
  routeId: string
  routeShortName: string | null
  routeLongName: string | null
  directionId: string | null
  headsign: string | null
  shapeId: string
  color: string
}

function stableRouteIndex(routeId: string) {
  return [...routeId].reduce((value, character) => ((value * 31) + character.charCodeAt(0)) >>> 0, 0)
}

/** A line color identifies a route only. Direction and shape remain explicit metadata. */
export function getStopMapRouteColor(routeId: string) {
  const featuredColor = getRouteDisplayColor(routeId)
  return featuredColor === defaultRouteColor
    ? additionalRouteColors[stableRouteIndex(routeId) % additionalRouteColors.length]
    : featuredColor
}

export function stopMapRouteColorExpression(geometry: StopServingGeometry) {
  const routeIds = [...new Set(geometry.features.map((feature) => feature.properties.routeId))]
  return ['match', ['get', 'routeId'], ...routeIds.flatMap((routeId) => [routeId, getStopMapRouteColor(routeId)]), defaultRouteColor]
}

export function stopMapLegendEntries(geometry: StopServingGeometry | undefined): StopMapLegendEntry[] {
  if (!geometry) return []

  return geometry.features.map(({ properties }) => ({
    routeId: properties.routeId,
    routeShortName: properties.routeShortName,
    routeLongName: properties.routeLongName,
    directionId: properties.directionId,
    headsign: properties.headsign,
    shapeId: properties.shapeId,
    color: getStopMapRouteColor(properties.routeId),
  }))
}
