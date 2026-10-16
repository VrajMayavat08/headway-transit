import cors from '@fastify/cors'
import Fastify from 'fastify'
import type { Pool } from 'pg'
import { checkDatabaseHealth } from './db/health.js'
import { createDatabasePool } from './db/pool.js'
import { registerRouteGeometryEndpoint } from './schedules/routeGeometryEndpoint.js'
import { registerRouteStopsEndpoint } from './schedules/routeStopsEndpoint.js'
import { registerRoutesEndpoint } from './schedules/routesEndpoint.js'
import { registerRealtimeVehiclesEndpoint } from './realtime/vehiclesEndpoint.js'
import { registerHeadwaysEndpoint } from './reliability/headwaysEndpoint.js'
import { registerPlaybackVehiclesEndpoint } from './playback/vehiclesEndpoint.js'
import { registerAlertsEndpoint } from './alerts/alertsEndpoint.js'
import type { TtcServiceAlertsService } from './alerts/ttcServiceAlerts.js'

interface AppOptions {
  database?: Pool | null
  alertsService?: TtcServiceAlertsService
}

export function buildApp({ database = createDatabasePool(), alertsService }: AppOptions = {}) {
  const app = Fastify({ logger: true })

  app.register(cors, { origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] })

  app.get('/health', async () => ({
    status: 'ok',
    service: 'headway-api',
    timestamp: new Date().toISOString(),
  }))

  app.get('/health/db', async (_request, reply) => {
    const health = await checkDatabaseHealth(database)
    return health.status === 'healthy' ? health : reply.code(503).send(health)
  })

  registerRoutesEndpoint(app, database)
  registerRouteStopsEndpoint(app, database)
  registerRouteGeometryEndpoint(app, database)
  registerRealtimeVehiclesEndpoint(app, database)
  registerHeadwaysEndpoint(app, database)
  registerPlaybackVehiclesEndpoint(app, database)
  registerAlertsEndpoint(app, alertsService)

  app.addHook('onClose', async () => { await database?.end() })

  return app
}
