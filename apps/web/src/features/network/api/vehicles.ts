import { useQuery } from '@tanstack/react-query'

export type VehicleObservation = {
  entityId: string
  vehicleId: string | null
  reportedRouteId: string | null
  sourceTimestamp: number | null
  matchedSurfaceTripId: string | null
  latitude: number
  longitude: number
}

export type VehicleResponse = {
  status: 'current' | 'stale' | 'empty'
  snapshot: { fetchedAt: string; feedTimestamp: number | null; vehicleCount: number } | null
  observations: VehicleObservation[]
}

function nullableText(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function timestamp(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 8_640_000_000_000 ? value : null
}

export async function fetchVehicles(signal?: AbortSignal): Promise<VehicleResponse> {
  const response = await fetch('/api/realtime/vehicles', { signal })
  if (!response.ok) throw new Error('Vehicle observations are unavailable.')
  const data = await response.json() as Record<string, unknown>
  if (!data || !['current', 'stale', 'empty'].includes(data.status as string) || !Array.isArray(data.observations)) {
    throw new Error('Invalid vehicle response.')
  }
  if (data.status === 'empty') return { status: 'empty', snapshot: null, observations: [] }
  const snapshot = data.snapshot as Record<string, unknown> | null
  if (!snapshot || typeof snapshot.fetchedAt !== 'string' || !Number.isFinite(Date.parse(snapshot.fetchedAt))) {
    throw new Error('Invalid vehicle snapshot.')
  }
  return {
    status: data.status as VehicleResponse['status'],
    snapshot: snapshot ? {
      fetchedAt: snapshot.fetchedAt as string,
      feedTimestamp: timestamp(snapshot.feedTimestamp),
      vehicleCount: typeof snapshot.vehicleCount === 'number' ? snapshot.vehicleCount : 0,
    } : null,
    observations: data.observations.flatMap((item: unknown) => {
      if (!item || typeof item !== 'object') return []
      const row = item as Record<string, unknown>
      if (typeof row.entityId !== 'string' || typeof row.latitude !== 'number' || typeof row.longitude !== 'number'
        || !Number.isFinite(row.latitude) || !Number.isFinite(row.longitude)
        || Math.abs(row.latitude) > 90 || Math.abs(row.longitude) > 180) return []
      return [{
        entityId: row.entityId, vehicleId: nullableText(row.vehicleId), reportedRouteId: nullableText(row.reportedRouteId),
        matchedSurfaceTripId: nullableText(row.matchedSurfaceTripId), sourceTimestamp: timestamp(row.sourceTimestamp),
        latitude: row.latitude, longitude: row.longitude,
      }]
    }),
  }
}

export function useVehicles() {
  return useQuery({
    queryKey: ['network', 'realtime-vehicles'],
    queryFn: ({ signal }) => fetchVehicles(signal),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    staleTime: 30_000,
    retry: 1,
  })
}
