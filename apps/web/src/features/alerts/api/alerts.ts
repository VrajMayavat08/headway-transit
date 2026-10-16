import { useQuery } from '@tanstack/react-query'
import type { AlertsResponse, ServiceAlert } from '@/features/alerts/types'

function nullableText(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function textArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isAlert(value: unknown): value is ServiceAlert {
  if (!value || typeof value !== 'object') return false
  const alert = value as Partial<ServiceAlert>
  return typeof alert.alertId === 'string'
    && (alert.title === null || typeof alert.title === 'string')
    && (alert.description === null || typeof alert.description === 'string')
    && textArray(alert.affectedRouteIds)
    && textArray(alert.affectedStopIds)
    && Array.isArray(alert.activePeriods)
}

export async function fetchServiceAlerts(routeId: string, signal?: AbortSignal): Promise<AlertsResponse> {
  const search = routeId === 'all' ? '' : `?routeId=${encodeURIComponent(routeId)}`
  const response = await fetch(`/api/alerts${search}`, { signal })
  if (!response.ok) throw new Error('The TTC service-alert feed is temporarily unavailable.')
  const data = await response.json() as Partial<AlertsResponse>
  if (!data || !['available', 'empty'].includes(data.status ?? '') || !data.source
    || typeof data.source.name !== 'string' || typeof data.source.url !== 'string' || typeof data.source.attribution !== 'string'
    || typeof data.fetchedAt !== 'string' || !Array.isArray(data.alerts) || !data.alerts.every(isAlert)) {
    throw new Error('The TTC service-alert response was invalid.')
  }
  return {
    status: data.status as AlertsResponse['status'],
    source: data.source,
    fetchedAt: data.fetchedAt,
    feedTimestamp: nullableText(data.feedTimestamp),
    routeId: nullableText(data.routeId),
    totalAlertCount: typeof data.totalAlertCount === 'number' ? data.totalAlertCount : data.alerts.length,
    alerts: data.alerts,
  }
}

export function useServiceAlerts(routeId: string) {
  return useQuery({
    queryKey: ['alerts', 'ttc-service-alerts', routeId],
    queryFn: ({ signal }) => fetchServiceAlerts(routeId, signal),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    retry: 1,
  })
}
