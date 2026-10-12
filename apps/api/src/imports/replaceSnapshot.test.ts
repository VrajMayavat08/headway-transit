import assert from 'node:assert/strict'
import test from 'node:test'
import { deleteFeedSnapshot } from './replaceSnapshot.js'

test('deletes trips before stops so PostgreSQL cascades their stop times', async () => {
  const queries: Array<{ text: string; values?: unknown[] }> = []
  const client = { query: async (text: string, values?: unknown[]) => { queries.push({ text, values }) } }

  await deleteFeedSnapshot(client as never, 'ttc-static')

  assert.deepEqual(
    queries.map(({ text }) => text.match(/DELETE FROM (\w+)/)?.[1]),
    ['trips', 'shapes', 'calendar_dates', 'calendar', 'routes', 'stops', 'agencies', 'feed_imports'],
  )
  assert.ok(queries.every(({ values }) => values?.[0] === 'ttc-static'))
  assert.equal(queries.some(({ text }) => text.startsWith('DELETE FROM stop_times')), false)
  assert.ok(queries.findIndex(({ text }) => text.startsWith('DELETE FROM trips')) < queries.findIndex(({ text }) => text.startsWith('DELETE FROM stops')))
})

test('targets only the requested source key when replacing a snapshot', async () => {
  const queries: Array<{ text: string; values?: unknown[] }> = []
  const client = { query: async (text: string, values?: unknown[]) => { queries.push({ text, values }) } }

  await deleteFeedSnapshot(client as never, 'ttc-surface')

  assert.ok(queries.every(({ values }) => values?.[0] === 'ttc-surface'))
  assert.equal(queries.some(({ values }) => values?.includes('ttc-static')), false)
})
