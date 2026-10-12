import assert from 'node:assert/strict'
import test from 'node:test'
import type { Pool } from 'pg'
import { createTtcVehicleCollector } from './ttcVehicleCollector.js'

test('does not overlap collection runs and leaves stored observations untouched when fetching fails', async () => {
  let fetchCalls = 0
  let rejectFetch: ((reason?: unknown) => void) | undefined
  const failedFetch = () => new Promise<never>((_resolve, reject) => {
    fetchCalls += 1
    rejectFetch = reject
  })
  let databaseConnections = 0
  const errors: unknown[] = []
  const collector = createTtcVehicleCollector({
    database: { connect: async () => { databaseConnections += 1; throw new Error('database should not be reached') } } as unknown as Pool,
    intervalMs: 60_000,
    retentionMs: 604_800_000,
    fetcher: failedFetch,
    onError: (error) => errors.push(error),
  })

  const first = collector.runOnce()
  const second = collector.runOnce()
  assert.equal(fetchCalls, 1)
  rejectFetch?.(new Error('TTC unavailable'))
  await Promise.all([first, second])

  assert.equal(databaseConnections, 0)
  assert.equal(errors.length, 1)
  assert.equal(collector.isRunning(), false)
})
