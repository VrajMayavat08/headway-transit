import type { FastifyInstance } from 'fastify'
import type { Pool } from 'pg'
import { getRealtimeConfig } from '../config.js'
import { getPlaybackVehicles } from './vehicles.js'

export function registerPlaybackVehiclesEndpoint(app: FastifyInstance, database: Pool | null) {
  app.get<{ Querystring: { timestamp: string; routeId?: string } }>('/api/playback/vehicles', {
    schema: { querystring: {
      type: 'object', required: ['timestamp'], additionalProperties: false,
      properties: {
        timestamp: { type: 'string', format: 'date-time', maxLength: 40 },
        routeId: { type: 'string', minLength: 1, maxLength: 64, pattern: '^[A-Za-z0-9_.:-]+$' },
      },
    } },
  }, async (request, reply) => {
    if (!database) return reply.code(503).send({ status: 'unavailable' })
    try {
      return await getPlaybackVehicles(database, request.query.timestamp, request.query.routeId, getRealtimeConfig().retentionMs)
    } catch (error) {
      app.log.error(error, 'Unable to read historical TTC snapshot')
      return reply.code(503).send({ status: 'unavailable' })
    }
  })
}
