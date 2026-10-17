import { getTtcSurfaceRoute } from '@/features/network/data/ttcSurfaceRoutes'
import type { VehicleIconKind } from '@/features/network/lib/vehicleIcons'

export type { VehicleIconKind } from '@/features/network/lib/vehicleIcons'

export function vehicleIconKind(matchedSurfaceRouteId: string | null): VehicleIconKind {
  const route = getTtcSurfaceRoute(matchedSurfaceRouteId)
  if (!route) return 'vehicle'
  if (route.routeType === 3) return 'bus'
  if (route.routeType === 0) return 'streetcar'
  return 'vehicle'
}

export function vehicleTypeLabel(kind: VehicleIconKind) {
  return kind === 'vehicle' ? 'Vehicle type not confirmed' : `Confirmed ${kind}`
}
