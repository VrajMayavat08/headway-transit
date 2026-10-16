import { useQuery } from '@tanstack/react-query'
import { apiUrl } from '@/lib/api/url'

export type HeadwayResult = {
  routeId: string
  directionId: string
  shapeId: string
  status: 'available' | 'insufficient_data'
  passageCount: number
  headwayCount: number
  sampleCount: number
  meanHeadwayBoundsSeconds: { minimum: number; maximum: number } | null
}

export type ObservedHeadways = {
  status: 'available' | 'insufficient_data'
  window: { start: string; end: string }
  coverage: { snapshotCount: number; sampleCount: number; firstCollectedAt: string | null; lastCollectedAt: string | null; gapCount: number; capped: boolean }
  results: HeadwayResult[]
  unavailableRoutes: string[]
}

export function useObservedHeadways(routeId: string) {
  return useQuery({
    queryKey: ['reliability', 'headway-bounds', routeId],
    queryFn: async ({ signal }): Promise<ObservedHeadways> => {
      const suffix = routeId === 'all' ? '' : `?routeId=${encodeURIComponent(routeId)}`
      const response = await fetch(apiUrl(`/api/reliability/headways${suffix}`), { signal })
      if (!response.ok) throw new Error('Observed headway analysis is unavailable.')
      const data = await response.json() as ObservedHeadways
      if (!data || !['available', 'insufficient_data'].includes(data.status) || !data.window || !data.coverage || !Array.isArray(data.results)) {
        throw new Error('Invalid headway analysis response.')
      }
      return data
    },
    staleTime: 60_000,
    retry: 1,
  })
}
