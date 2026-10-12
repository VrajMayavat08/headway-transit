import type { FastifyInstance } from 'fastify'
import type { Pool } from 'pg'
import { getTtcRouteStops } from './routeStops.js'

export function registerRouteStopsEndpoint(app: FastifyInstance, database: Pool | null) {
  app.get<{ Params: { routeId: string } }>('/api/routes/:routeId/stops', async (request, reply) => {
    if (!database) {
      return reply.code(503).send({ status: 'unavailable' })
    }

    try {
      return await getTtcRouteStops(database, request.params.routeId)
    } catch (error) {
      app.log.error(error, 'Unable to read TTC route stops')
      return reply.code(503).send({ status: 'unavailable' })
    }
  })
}
