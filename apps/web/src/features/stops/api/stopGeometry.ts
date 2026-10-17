import { useQuery } from '@tanstack/react-query'
import { apiUrl } from '@/lib/api/url'
export type StopServingGeometryFeature = {
  type: 'Feature'
  properties: {
    routeId: string
    routeShortName: string | null
    routeLongName: string | null
    directionId: string | null
    headsign: string | null
    shapeId: string
    tripId: string
    tripCount: number
  }
  geometry: { type: 'LineString'; coordinates: Array<[number, number]> }
}

export type StopServingGeometry = {
  type: 'FeatureCollection'
  features: StopServingGeometryFeature[]
}

function isStopServingGeometry(value: unknown): value is StopServingGeometry {
  if (!value || typeof value !== 'object') return false

  const collection = value as Record<string, unknown>
  return collection.type === 'FeatureCollection'
    && Array.isArray(collection.features)
    && collection.features.every((feature) => {
      if (!feature || typeof feature !== 'object') return false
      const item = feature as Record<string, unknown>
      const properties = item.properties as Record<string, unknown> | undefined
      const geometry = item.geometry as Record<string, unknown> | undefined
      return item.type === 'Feature'
        && typeof properties?.routeId === 'string'
        && (typeof properties.routeShortName === 'string' || properties.routeShortName === null)
        && (typeof properties.routeLongName === 'string' || properties.routeLongName === null)
        && (typeof properties.directionId === 'string' || properties.directionId === null)
        && (typeof properties.headsign === 'string' || properties.headsign === null)
        && typeof properties.shapeId === 'string'
        && typeof properties.tripId === 'string'
        && typeof properties.tripCount === 'number'
        && geometry?.type === 'LineString'
        && Array.isArray(geometry.coordinates)
        && geometry.coordinates.every((coordinate) => Array.isArray(coordinate)
          && coordinate.length === 2
          && typeof coordinate[0] === 'number'
          && typeof coordinate[1] === 'number')
    })
}

async function fetchStopServingGeometry(stopId: string, signal?: AbortSignal): Promise<StopServingGeometry> {
  const response = await fetch(apiUrl(`/api/stops/${encodeURIComponent(stopId)}/geometry`), { signal })
  if (!response.ok) throw new Error('TTC stop-serving geometry is unavailable.')

  const data: unknown = await response.json()
  if (!isStopServingGeometry(data)) throw new Error('TTC stop-serving geometry returned an invalid response.')
  return data
}

export function useStopServingGeometry(stopId: string | null) {
  return useQuery({
    queryKey: ['schedule-stop-serving-geometry', stopId],
    queryFn: ({ signal }) => fetchStopServingGeometry(stopId as string, signal),
    enabled: stopId !== null,
  })
}
