import cors from '@fastify/cors'
import Fastify from 'fastify'
import { checkDatabaseHealth } from './db/health.js'
import { createDatabasePool } from './db/pool.js'

export function buildApp() {
  const app = Fastify({ logger: true })
  const database = createDatabasePool()

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

  app.addHook('onClose', async () => { await database?.end() })

  return app
}
