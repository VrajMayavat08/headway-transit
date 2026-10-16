import GtfsRealtimeBindings from 'gtfs-realtime-bindings'

export const TTC_SERVICE_ALERTS_URL = 'https://bustime.ttc.ca/gtfsrt/alerts'
export const TTC_SERVICE_ALERTS_SOURCE = 'TTC BusTime GTFS-Realtime'
export const TTC_DATA_ATTRIBUTION = 'Contains information licensed under the Open Government Licence - Toronto'
export const TTC_SERVICE_ALERTS_TIMEOUT_MS = 10_000

export type AlertActivePeriod = {
  start: string | null
  end: string | null
}

export type TtcServiceAlert = {
  alertId: string
  title: string | null
  description: string | null
  affectedRouteIds: string[]
  affectedStopIds: string[]
  cause: string | null
  effect: string | null
  severity: 'info' | 'warning' | 'severe' | null
  activePeriods: AlertActivePeriod[]
  url: string | null
  source: string
  lastUpdatedAt: string | null
}

export type TtcServiceAlertsSnapshot = {
  fetchedAt: string
  feedTimestamp: string | null
  alerts: TtcServiceAlert[]
}

export type AlertsFetchResponse = {
  ok: boolean
  status: number
  statusText: string
  arrayBuffer: () => Promise<ArrayBuffer>
}

export type AlertsFetch = (url: string, init: { headers: Record<string, string>; signal: AbortSignal }) => Promise<AlertsFetchResponse>

export class TtcServiceAlertsFetchError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TtcServiceAlertsFetchError'
  }
}

const causes: Record<number, string> = {
  1: 'UNKNOWN_CAUSE', 2: 'OTHER_CAUSE', 3: 'TECHNICAL_PROBLEM', 4: 'STRIKE',
  5: 'DEMONSTRATION', 6: 'ACCIDENT', 7: 'HOLIDAY', 8: 'WEATHER', 9: 'MAINTENANCE',
  10: 'CONSTRUCTION', 11: 'POLICE_ACTIVITY', 12: 'MEDICAL_EMERGENCY', 13: 'SPECIAL_EVENT',
}

const effects: Record<number, string> = {
  1: 'NO_SERVICE', 2: 'REDUCED_SERVICE', 3: 'SIGNIFICANT_DELAYS', 4: 'DETOUR',
  5: 'ADDITIONAL_SERVICE', 6: 'MODIFIED_SERVICE', 7: 'OTHER_EFFECT', 8: 'UNKNOWN_EFFECT',
  9: 'STOP_MOVED', 10: 'NO_EFFECT', 11: 'ACCESSIBILITY_ISSUE',
}

const severities: Record<number, TtcServiceAlert['severity']> = {
  2: 'info', 3: 'warning', 4: 'severe',
}

function numberValue(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (value && typeof value === 'object' && 'toString' in value) {
    const parsed = Number(value.toString())
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function instant(value: unknown): string | null {
  const seconds = numberValue(value)
  if (seconds === null || seconds < 0) return null
  const date = new Date(seconds * 1000)
  return Number.isFinite(date.getTime()) ? date.toISOString() : null
}

function translatedText(value: { translation?: Array<{ text?: string | null; language?: string | null }> | null } | null | undefined) {
  const translations = value?.translation ?? []
  const selected = translations.find(({ language }) => language?.toLowerCase() === 'en')
    ?? translations.find(({ language }) => language?.toLowerCase().startsWith('en'))
    ?? translations[0]
  const text = selected?.text?.trim()
  return text || null
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
}

export async function fetchTtcServiceAlerts(
  fetcher: AlertsFetch = fetch,
  now = () => new Date(),
): Promise<TtcServiceAlertsSnapshot> {
  const response = await fetcher(TTC_SERVICE_ALERTS_URL, {
    headers: { Accept: 'application/x-protobuf' },
    signal: AbortSignal.timeout(TTC_SERVICE_ALERTS_TIMEOUT_MS),
  })
  if (!response.ok) throw new TtcServiceAlertsFetchError(`TTC service alerts request failed: ${response.status} ${response.statusText}`)

  const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(await response.arrayBuffer()))
  const feedTimestamp = Object.hasOwn(feed.header, 'timestamp') ? instant(feed.header.timestamp) : null
  const alerts = feed.entity.flatMap((entity) => {
    const alert = entity.alert
    if (!alert) return []

    return [{
      alertId: entity.id,
      title: translatedText(alert.headerText),
      description: translatedText(alert.descriptionText),
      affectedRouteIds: unique((alert.informedEntity ?? []).map(({ routeId }) => routeId)),
      affectedStopIds: unique((alert.informedEntity ?? []).map(({ stopId }) => stopId)),
      cause: Object.hasOwn(alert, 'cause') && alert.cause != null ? causes[alert.cause] ?? null : null,
      effect: Object.hasOwn(alert, 'effect') && alert.effect != null ? effects[alert.effect] ?? null : null,
      severity: Object.hasOwn(alert, 'severityLevel') && alert.severityLevel != null ? severities[alert.severityLevel] ?? null : null,
      activePeriods: (alert.activePeriod ?? []).map((period) => ({
        start: Object.hasOwn(period, 'start') ? instant(period.start) : null,
        end: Object.hasOwn(period, 'end') ? instant(period.end) : null,
      })),
      url: translatedText(alert.url),
      source: TTC_SERVICE_ALERTS_SOURCE,
      lastUpdatedAt: feedTimestamp,
    } satisfies TtcServiceAlert]
  })

  return { fetchedAt: now().toISOString(), feedTimestamp, alerts }
}

export function createTtcServiceAlertsService({
  fetcher = fetch,
  now = () => new Date(),
  cacheMs = 30_000,
}: {
  fetcher?: AlertsFetch
  now?: () => Date
  cacheMs?: number
} = {}) {
  let cached: { expiresAt: number; snapshot: TtcServiceAlertsSnapshot } | null = null
  let pending: Promise<TtcServiceAlertsSnapshot> | null = null

  return {
    async getAlerts() {
      const currentTime = now().getTime()
      if (cached && currentTime < cached.expiresAt) return cached.snapshot
      if (pending) return pending

      pending = fetchTtcServiceAlerts(fetcher, now).then((snapshot) => {
        cached = { expiresAt: now().getTime() + cacheMs, snapshot }
        return snapshot
      }).finally(() => { pending = null })
      return pending
    },
  }
}

export type TtcServiceAlertsService = ReturnType<typeof createTtcServiceAlertsService>
