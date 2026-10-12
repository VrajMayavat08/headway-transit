import type { FastifyInstance } from 'fastify'
import type { Pool } from 'pg'
import { getTtcRouteGeometry } from './routeGeometry.js'

export function registerRouteGeometryEndpoint(app: FastifyInstance, database: Pool | null) {
  app.get<{ Params: { routeId: string } }>('/api/routes/:routeId/geometry', async (request, reply) => {
    if (!database) {
      return reply.code(503).send({ status: 'unavailable' })
    }

    try {
      return await getTtcRouteGeometry(database, request.params.routeId)
    } catch (error) {
      app.log.error(error, 'Unable to read TTC route geometry')
      return reply.code(503).send({ status: 'unavailable' })
    }
  })
}
