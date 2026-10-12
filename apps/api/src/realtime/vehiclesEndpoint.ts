import type { FastifyInstance } from 'fastify'
import type { Pool } from 'pg'
import { getRealtimeConfig } from '../config.js'
import { getLatestVehicleObservations } from './vehicleObservations.js'

export function registerRealtimeVehiclesEndpoint(app: FastifyInstance, database: Pool | null) {
  app.get('/api/realtime/vehicles', async (_request, reply) => {
    if (!database) return reply.code(503).send({ status: 'unavailable' })
    try {
      return await getLatestVehicleObservations(database, getRealtimeConfig().staleAfterMs)
    } catch (error) {
      app.log.error(error, 'Unable to read TTC vehicle observations')
      return reply.code(503).send({ status: 'unavailable' })
    }
  })
}
