import { buildApp } from './app.js'
import { getApiConfig, getRealtimeConfig } from './config.js'
import { createDatabasePool } from './db/pool.js'
import { createTtcVehicleCollector } from './realtime/ttcVehicleCollector.js'

const database = createDatabasePool()
const app = buildApp({ database })
const { host, port } = getApiConfig()
const realtime = getRealtimeConfig()
const collector = database && realtime.collectorEnabled
  ? createTtcVehicleCollector({ database, intervalMs: realtime.intervalMs, retentionMs: realtime.retentionMs, onError: (error) => app.log.error(error, 'TTC vehicle collection failed') })
  : null

async function shutdown(signal: string) {
  app.log.info({ signal }, 'Shutting down Headway API')
  await collector?.stop()
  await app.close()
  process.exit(0)
}

process.once('SIGINT', () => { void shutdown('SIGINT') })
process.once('SIGTERM', () => { void shutdown('SIGTERM') })

try {
  await app.listen({ host, port })
  if (collector) collector.start()
} catch (error) {
  app.log.error(error)
  process.exit(1)
}
