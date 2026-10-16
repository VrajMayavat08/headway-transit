import { useQuery } from '@tanstack/react-query'

export type HistoricalVehicle = {
  entityId: string
  vehicleId: string | null
  reportedRouteId: string | null
  reportedTripId: string | null
  sourceTimestamp: number | null
  latitude: number
  longitude: number
}
export type PlaybackResponse = {
  status: 'available' | 'no_data' | 'outside_retention'
  requestedAt: string
  routeId: string | null
  toleranceSeconds: number
  retention: { start: string; end: string }
  window: { start: string | null; end: string | null }
  timeline: string[]
  timelineTruncated: boolean
  snapshot: { snapshotId: string; fetchedAt: string; feedTimestamp: number | null; vehicleCount: number } | null
  observations: HistoricalVehicle[]
  observationsTruncated: boolean
}

export function usePlaybackVehicles(timestamp: string, routeId: string) {
  return useQuery({
    queryKey: ['playback', 'vehicles', timestamp, routeId],
    queryFn: async ({ signal }): Promise<PlaybackResponse> => {
      const query = new URLSearchParams({ timestamp })
      if (routeId !== 'all') query.set('routeId', routeId)
      const response = await fetch(`/api/playback/vehicles?${query}`, { signal })
      if (!response.ok) throw new Error('Historical observations are unavailable.')
      const data = await response.json() as PlaybackResponse
      if (!data || !['available', 'no_data', 'outside_retention'].includes(data.status) || !Array.isArray(data.timeline)
        || !data.timeline.every((value) => typeof value === 'string' && Number.isFinite(Date.parse(value)))
        || !Array.isArray(data.observations) || (data.status === 'available' && !data.snapshot)) {
        throw new Error('Invalid historical snapshot response.')
      }
      return {
        ...data,
        observations: data.observations.filter((vehicle) => vehicle && typeof vehicle.entityId === 'string'
          && typeof vehicle.latitude === 'number' && Number.isFinite(vehicle.latitude) && Math.abs(vehicle.latitude) <= 90
          && typeof vehicle.longitude === 'number' && Number.isFinite(vehicle.longitude) && Math.abs(vehicle.longitude) <= 180),
      }
    },
    staleTime: 30_000,
    gcTime: 5_000,
    retry: 1,
    refetchOnWindowFocus: false,
  })
}
