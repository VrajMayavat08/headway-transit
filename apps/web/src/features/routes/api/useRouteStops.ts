import { useQuery } from '@tanstack/react-query'
import { fetchScheduleRouteStops, scheduleRouteStopsQueryKey } from './routes'

export function useRouteStops(routeId: string | null) {
  return useQuery({
    queryKey: scheduleRouteStopsQueryKey(routeId),
    queryFn: ({ signal }) => fetchScheduleRouteStops(routeId as string, signal),
    enabled: routeId !== null,
  })
}
