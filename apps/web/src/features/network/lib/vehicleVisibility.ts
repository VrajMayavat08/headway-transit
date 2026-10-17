import type { VehicleObservation } from '@/features/network/api/vehicles'

export function vehiclesForSelectedRoute(observations: VehicleObservation[], routeId: string | null) {
  if (!routeId) return []
  return observations.filter((vehicle) => vehicle.reportedRouteId === routeId)
}
