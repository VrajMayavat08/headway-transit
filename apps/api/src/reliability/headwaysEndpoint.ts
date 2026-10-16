import type { FastifyInstance } from 'fastify'
import type { Pool } from 'pg'
import { featuredRouteIds, getObservedHeadways } from './headways.js'

export function registerHeadwaysEndpoint(app: FastifyInstance, database: Pool | null) {
  app.get<{ Querystring: { routeId?: string } }>('/api/reliability/headways', {
    schema: { querystring: { type: 'object', additionalProperties: false, properties: { routeId: { type: 'string', enum: featuredRouteIds } } } },
  }, async (request, reply) => {
    if (!database) return reply.code(503).send({ status: 'unavailable' })
    try {
      return await getObservedHeadways(database, request.query.routeId ? [request.query.routeId] : featuredRouteIds)
    } catch (error) {
      app.log.error(error, 'Unable to analyze observed TTC headway bounds')
      return reply.code(503).send({ status: 'unavailable' })
    }
  })
}
