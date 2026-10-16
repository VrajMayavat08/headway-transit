import type { FastifyInstance } from 'fastify'
import {
  createTtcServiceAlertsService,
  TTC_DATA_ATTRIBUTION,
  TTC_SERVICE_ALERTS_SOURCE,
  TTC_SERVICE_ALERTS_URL,
  type TtcServiceAlertsService,
} from './ttcServiceAlerts.js'

type AlertsQuery = { routeId?: string }

export function registerAlertsEndpoint(
  app: FastifyInstance,
  service: TtcServiceAlertsService = createTtcServiceAlertsService(),
) {
  app.get<{ Querystring: AlertsQuery }>('/api/alerts', {
    schema: {
      querystring: {
        type: 'object',
        additionalProperties: false,
        properties: {
          routeId: { type: 'string', minLength: 1, maxLength: 64, pattern: '^[A-Za-z0-9_.:-]+$' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const snapshot = await service.getAlerts()
      const alerts = request.query.routeId
        ? snapshot.alerts.filter(({ affectedRouteIds }) => affectedRouteIds.includes(request.query.routeId as string))
        : snapshot.alerts
      return {
        status: snapshot.alerts.length ? 'available' : 'empty',
        source: {
          name: TTC_SERVICE_ALERTS_SOURCE,
          url: TTC_SERVICE_ALERTS_URL,
          attribution: TTC_DATA_ATTRIBUTION,
        },
        fetchedAt: snapshot.fetchedAt,
        feedTimestamp: snapshot.feedTimestamp,
        routeId: request.query.routeId ?? null,
        totalAlertCount: snapshot.alerts.length,
        alerts,
      }
    } catch (error) {
      app.log.error(error, 'Unable to fetch TTC service alerts')
      return reply.code(503).send({
        status: 'unavailable',
        source: { name: TTC_SERVICE_ALERTS_SOURCE, url: TTC_SERVICE_ALERTS_URL, attribution: TTC_DATA_ATTRIBUTION },
      })
    }
  })
}
