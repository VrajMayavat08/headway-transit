import assert from 'node:assert/strict'
import test from 'node:test'
import type { Pool } from 'pg'
import { buildApp } from '../app.js'

function createDatabase(rows: unknown[]) {
  const queries: Array<{ text: string; values?: unknown[] }> = []
  const database = {
    query: async (text: string, values?: unknown[]) => {
      queries.push({ text, values })
      return { rows }
    },
    end: async () => undefined,
  } as unknown as Pool

  return { database, queries }
}

test('GET /api/routes returns TTC routes using a parameterized current-feed query', async () => {
  const { database, queries } = createDatabase([
    {
      routeId: '29',
      shortName: '29',
      longName: 'Dufferin',
      routeType: '3',
      color: 'ED1C24',
    },
  ])
  const app = buildApp({ database })

  const response = await app.inject({ method: 'GET', url: '/api/routes' })

  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), [{
    routeId: '29',
    shortName: '29',
    longName: 'Dufferin',
    routeType: '3',
    color: 'ED1C24',
  }])
  assert.equal(queries.length, 1)
  assert.deepEqual(queries[0]?.values, ['ttc-static'])
  assert.match(queries[0]?.text ?? '', /source_key = \$1/)
  assert.match(queries[0]?.text ?? '', /ORDER BY/)

  await app.close()
})

test('GET /api/routes returns an empty array when the TTC feed has no routes', async () => {
  const { database } = createDatabase([])
  const app = buildApp({ database })

  const response = await app.inject({ method: 'GET', url: '/api/routes' })

  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), [])

  await app.close()
})
