import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getTtcSurfaceRoute } from '@/features/network/data/ttcSurfaceRoutes'
import { getTtcSurfaceStop } from '@/features/network/data/ttcSurfaceStops'

export function useRouteSelection(selectedRouteId: string | null, onRouteSelect: (routeId: string) => void) {
  const [selectedStopId, selectStop] = useState<string | null>(null)
  const selectedRoute = useMemo(() => getTtcSurfaceRoute(selectedRouteId), [selectedRouteId])
  const selectedStop = useMemo(() => getTtcSurfaceStop(selectedStopId), [selectedStopId])
  const previousRouteId = useRef(selectedRouteId)

  useEffect(() => {
    if (previousRouteId.current !== selectedRouteId) selectStop(null)
    previousRouteId.current = selectedRouteId
  }, [selectedRouteId])

  const selectRouteAndClearStop = useCallback((routeId: string) => {
    onRouteSelect(routeId)
    selectStop(null)
  }, [onRouteSelect])

  return { selectedRoute, selectRoute: selectRouteAndClearStop, selectedStopId, selectedStop, selectStop }
}
