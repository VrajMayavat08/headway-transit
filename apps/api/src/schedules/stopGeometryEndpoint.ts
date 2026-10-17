import type { FastifyInstance } from 'fastify'
import type { Pool } from 'pg'
import { getTtcStopServingGeometry } from './stopGeometry.js'

export function registerStopGeometryEndpoint(app: FastifyInstance, database: Pool | null) {
  app.get<{ Params: { stopId: string } }>('/api/stops/:stopId/geometry', async (request, reply) => {
    if (!database) return reply.code(503).send({ status: 'unavailable' })

    try {
      return await getTtcStopServingGeometry(database, request.params.stopId)
    } catch (error) {
      app.log.error(error, 'Unable to read TTC stop-serving geometry')
      return reply.code(503).send({ status: 'unavailable' })
    }
  })
}
