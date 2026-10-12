import type { FastifyInstance } from 'fastify'
import type { Pool } from 'pg'
import { listTtcRoutes } from './routes.js'

export function registerRoutesEndpoint(app: FastifyInstance, database: Pool | null) {
  app.get('/api/routes', async (_request, reply) => {
    if (!database) {
      return reply.code(503).send({ status: 'unavailable' })
    }

    try {
      return await listTtcRoutes(database)
    } catch (error) {
      app.log.error(error, 'Unable to read TTC routes')
      return reply.code(503).send({ status: 'unavailable' })
    }
  })
}
