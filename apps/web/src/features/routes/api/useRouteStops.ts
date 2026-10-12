import { useQuery } from '@tanstack/react-query'
import { fetchScheduleRouteStops, scheduleRouteStopsQueryKey } from './routes'

export function useRouteStops(routeId: string | null) {
  return useQuery({
    queryKey: scheduleRouteStopsQueryKey(routeId),
    queryFn: () => fetchScheduleRouteStops(routeId as string),
    enabled: routeId !== null,
  })
}
