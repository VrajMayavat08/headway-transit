import 'dotenv/config'

export type ApiConfig = {
  host: string
  port: number
}

export type RealtimeConfig = {
  collectorEnabled: boolean
  intervalMs: number
  staleAfterMs: number
  retentionMs: number
}

export function getApiConfig(environment = process.env): ApiConfig {
  const port = Number(environment.PORT ?? 3001)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port')

  return { host: environment.HOST ?? '127.0.0.1', port }
}

export function getRealtimeConfig(environment = process.env): RealtimeConfig {
  const intervalSeconds = Number(environment.TTC_VEHICLE_POLL_INTERVAL_SECONDS ?? 60)
  const staleAfterSeconds = Number(environment.TTC_VEHICLE_STALE_AFTER_SECONDS ?? 180)
  const retentionHours = Number(environment.TTC_VEHICLE_RETENTION_HOURS ?? 168)
  if (!Number.isInteger(intervalSeconds) || intervalSeconds < 30) throw new Error('TTC_VEHICLE_POLL_INTERVAL_SECONDS must be an integer of at least 30')
  if (!Number.isInteger(staleAfterSeconds) || staleAfterSeconds < intervalSeconds) throw new Error('TTC_VEHICLE_STALE_AFTER_SECONDS must be an integer at least as large as the polling interval')
  if (!Number.isInteger(retentionHours) || retentionHours < 1) throw new Error('TTC_VEHICLE_RETENTION_HOURS must be an integer of at least 1')
  return {
    collectorEnabled: environment.TTC_VEHICLE_COLLECTOR_ENABLED === 'true',
    intervalMs: intervalSeconds * 1000,
    staleAfterMs: staleAfterSeconds * 1000,
    retentionMs: retentionHours * 60 * 60 * 1000,
  }
}
