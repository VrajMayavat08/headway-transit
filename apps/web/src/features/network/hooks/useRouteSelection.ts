import { useCallback, useMemo, useState } from 'react'
import { getTtcSurfaceRoute } from '@/features/network/data/ttcSurfaceRoutes'
import { getTtcSurfaceStop } from '@/features/network/data/ttcSurfaceStops'

export function useRouteSelection() {
  const [selectedRouteId, selectRoute] = useState<string | null>(null)
  const [selectedStopId, selectStop] = useState<string | null>(null)
  const selectedRoute = useMemo(() => getTtcSurfaceRoute(selectedRouteId), [selectedRouteId])
  const selectedStop = useMemo(() => getTtcSurfaceStop(selectedStopId), [selectedStopId])
  const selectRouteAndClearStop = useCallback((routeId: string) => {
    selectRoute(routeId)
    selectStop(null)
  }, [])

  return { selectedRouteId, selectedRoute, selectRoute: selectRouteAndClearStop, selectedStopId, selectedStop, selectStop }
}
