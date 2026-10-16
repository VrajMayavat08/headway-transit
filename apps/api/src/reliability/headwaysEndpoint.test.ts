import assert from 'node:assert/strict'
import test from 'node:test'
import type { Pool } from 'pg'
import { buildApp } from '../app.js'

test('headway endpoint validates routes and uses bounded SurfaceGTFS observations without starting collection', async () => {
  const queries: { text: string; values?: unknown[] }[] = []
  const database = {
    connect: async () => ({
      query: async (text: string, values?: unknown[]) => {
        queries.push({ text, values })
        return { rows: [] }
      },
      release() {},
    }),
    end: async () => undefined,
  } as unknown as Pool
  const app = buildApp({ database })
  const invalid = await app.inject('/api/reliability/headways?routeId=invalid')
  assert.equal(invalid.statusCode, 400)
  assert.equal(queries.length, 0)
  const response = await app.inject('/api/reliability/headways?routeId=29')
  assert.equal(response.statusCode, 200)
  assert.equal(response.json().status, 'insufficient_data')
  const observations = queries.find(({ text }) => text.includes('FROM recent r JOIN vehicle_observations'))!
  assert.equal(observations.values?.[3], 'ttc-surface')
  assert.deepEqual(observations.values?.[4], ['29'])
  assert.equal(observations.values?.[5], 120001)
  assert.match(observations.text, /LIMIT 61/)
  assert.equal(queries.some(({ values }) => values?.includes('ttc-static')), false)
  await app.close()
})

test('database failures produce safe unavailable errors', async () => {
  const app = buildApp({ database: { connect: async () => { throw new Error('private database details') }, end: async () => undefined } as unknown as Pool })
  const response = await app.inject('/api/reliability/headways')
  assert.equal(response.statusCode, 503)
  assert.deepEqual(response.json(), { status: 'unavailable' })
  await app.close()
})

test('snapshot cap suppresses partial metrics and read failures roll back and release', async () => {
  const queries: string[] = []
  let released = false
  let fail = false
  const database = {
    connect: async () => ({
      query: async (text: string) => {
        queries.push(text)
        if (fail && text.includes('WITH shape_counts')) throw new Error('query failed')
        if (text.includes('array_agg(fetched_at')) return { rows: [{ snapshotCount: 62, first: null, last: null, collectionTimes: [] }] }
        return { rows: [] }
      },
      release() { released = true },
    }),
    end: async () => undefined,
  } as unknown as Pool
  const app = buildApp({ database })
  const capped = await app.inject('/api/reliability/headways')
  assert.equal(capped.statusCode, 200)
  assert.equal(capped.json().coverage.capped, true)
  assert.deepEqual(capped.json().results, [])
  assert.equal(released, true)
  fail = true
  released = false
  const failed = await app.inject('/api/reliability/headways')
  assert.equal(failed.statusCode, 503)
  assert.ok(queries.includes('ROLLBACK'))
  assert.equal(released, true)
  await app.close()
})
