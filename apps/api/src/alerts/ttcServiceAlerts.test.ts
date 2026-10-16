import assert from 'node:assert/strict'
import test from 'node:test'
import GtfsRealtimeBindings from 'gtfs-realtime-bindings'
import { buildApp } from '../app.js'
import {
  createTtcServiceAlertsService,
  fetchTtcServiceAlerts,
  TTC_SERVICE_ALERTS_URL,
  TtcServiceAlertsFetchError,
} from './ttcServiceAlerts.js'

function protobufResponse(feed: unknown) {
  const encoded = GtfsRealtimeBindings.transit_realtime.FeedMessage.encode(feed as never).finish()
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    arrayBuffer: async () => Uint8Array.from(encoded).buffer as ArrayBuffer,
  }
}

const feed = {
  header: { gtfsRealtimeVersion: '2.0', timestamp: 1_700_000_000 },
  entity: [{
    id: 'alert-1',
    alert: {
      informedEntity: [
        { agencyId: '1', routeId: '504', stopId: '1001' },
        { agencyId: '1', routeId: '504', stopId: '1001' },
        { agencyId: '1', routeId: '501' },
      ],
      cause: 10,
      effect: 4,
      severityLevel: 3,
      activePeriod: [{ start: 1_700_000_000, end: 1_700_003_600 }],
      headerText: { translation: [{ text: 'Détour', language: 'fr' }, { text: '  504 King detour  ', language: 'en' }] },
      descriptionText: { translation: [{ text: 'Streetcar diverting around construction.', language: 'en' }] },
      url: { translation: [{ text: 'https://www.ttc.ca/service-advisories', language: 'en' }] },
    },
  }],
}

test('official protobuf alerts are normalized without losing route, stop, timing, cause, effect, or severity fields', async () => {
  let requested: { url: string; headers: Record<string, string> } | undefined
  const snapshot = await fetchTtcServiceAlerts(async (url, init) => {
    requested = { url, headers: init.headers }
    return protobufResponse(feed)
  }, () => new Date('2026-10-16T12:00:00.000Z'))

  assert.deepEqual(requested, { url: TTC_SERVICE_ALERTS_URL, headers: { Accept: 'application/x-protobuf' } })
  assert.equal(snapshot.feedTimestamp, '2023-11-14T22:13:20.000Z')
  assert.equal(snapshot.fetchedAt, '2026-10-16T12:00:00.000Z')
  assert.deepEqual(snapshot.alerts[0], {
    alertId: 'alert-1',
    title: '504 King detour',
    description: 'Streetcar diverting around construction.',
    affectedRouteIds: ['504', '501'],
    affectedStopIds: ['1001'],
    cause: 'CONSTRUCTION',
    effect: 'DETOUR',
    severity: 'warning',
    activePeriods: [{ start: '2023-11-14T22:13:20.000Z', end: '2023-11-14T23:13:20.000Z' }],
    url: 'https://www.ttc.ca/service-advisories',
    source: 'TTC BusTime GTFS-Realtime',
    lastUpdatedAt: '2023-11-14T22:13:20.000Z',
  })
})

test('missing optional alert fields remain null or empty rather than receiving protobuf defaults', async () => {
  const snapshot = await fetchTtcServiceAlerts(async () => protobufResponse({
    header: { gtfsRealtimeVersion: '2.0' },
    entity: [{ id: 'minimal-alert', alert: {} }, { id: 'not-an-alert', vehicle: {} }],
  }))
  assert.deepEqual(snapshot.alerts, [{
    alertId: 'minimal-alert', title: null, description: null, affectedRouteIds: [], affectedStopIds: [],
    cause: null, effect: null, severity: null, activePeriods: [], url: null,
    source: 'TTC BusTime GTFS-Realtime', lastUpdatedAt: null,
  }])
})

test('upstream failures are explicit and unsuccessful requests are not cached', async () => {
  let calls = 0
  const service = createTtcServiceAlertsService({
    fetcher: async () => {
      calls += 1
      return { ok: false, status: 503, statusText: 'Service Unavailable', arrayBuffer: async () => new ArrayBuffer(0) }
    },
  })
  await assert.rejects(service.getAlerts(), TtcServiceAlertsFetchError)
  await assert.rejects(service.getAlerts(), TtcServiceAlertsFetchError)
  assert.equal(calls, 2)
})

test('successful upstream responses are cached briefly and empty feeds remain explicit', async () => {
  let calls = 0
  const service = createTtcServiceAlertsService({
    fetcher: async () => {
      calls += 1
      return protobufResponse({ header: { gtfsRealtimeVersion: '2.0' }, entity: [] })
    },
    cacheMs: 30_000,
  })
  assert.deepEqual((await service.getAlerts()).alerts, [])
  assert.deepEqual((await service.getAlerts()).alerts, [])
  assert.equal(calls, 1)
})

test('GET /api/alerts filters by affected route and distinguishes empty feeds from unavailable feeds', async () => {
  const populatedService = createTtcServiceAlertsService({ fetcher: async () => protobufResponse(feed) })
  const app = buildApp({ database: null, alertsService: populatedService })
  try {
    const matching = await app.inject('/api/alerts?routeId=504')
    assert.equal(matching.statusCode, 200)
    assert.equal(matching.json().status, 'available')
    assert.equal(matching.json().totalAlertCount, 1)
    assert.deepEqual(matching.json().alerts.map(({ alertId }: { alertId: string }) => alertId), ['alert-1'])

    const noMatch = await app.inject('/api/alerts?routeId=29')
    assert.equal(noMatch.statusCode, 200)
    assert.equal(noMatch.json().status, 'available')
    assert.deepEqual(noMatch.json().alerts, [])
    assert.equal((await app.inject('/api/alerts?routeId=')).statusCode, 400)
  } finally { await app.close() }

  const empty = buildApp({ database: null, alertsService: createTtcServiceAlertsService({ fetcher: async () => protobufResponse({ header: { gtfsRealtimeVersion: '2.0' }, entity: [] }) }) })
  try {
    const response = await empty.inject('/api/alerts')
    assert.equal(response.statusCode, 200)
    assert.equal(response.json().status, 'empty')
    assert.equal(response.json().totalAlertCount, 0)
  } finally { await empty.close() }

  const unavailable = buildApp({ database: null, alertsService: createTtcServiceAlertsService({
    fetcher: async () => { throw new Error('private upstream detail') },
  }) })
  try {
    const response = await unavailable.inject('/api/alerts')
    assert.equal(response.statusCode, 503)
    assert.equal(response.json().status, 'unavailable')
    assert.equal(JSON.stringify(response.json()).includes('private upstream detail'), false)
  } finally { await unavailable.close() }
})
