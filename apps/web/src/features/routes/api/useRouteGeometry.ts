import { useQuery } from '@tanstack/react-query'
import { fetchScheduleRouteGeometry, scheduleRouteGeometryQueryKey } from './routes'

export function useRouteGeometry(routeId: string | null) {
  return useQuery({
    queryKey: scheduleRouteGeometryQueryKey(routeId),
    queryFn: ({ signal }) => fetchScheduleRouteGeometry(routeId as string, signal),
    enabled: routeId !== null,
  })
}
