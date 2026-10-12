import type { Pool } from 'pg'
import { fetchTtcVehiclePositions, type RealtimeFetch } from './ttcVehiclePositions.js'
import { persistVehicleSnapshot } from './vehicleObservations.js'

export type TtcVehicleCollector = {
  runOnce: () => Promise<void>
  start: () => void
  stop: () => Promise<void>
  isRunning: () => boolean
}

export function createTtcVehicleCollector({
  database,
  intervalMs,
  retentionMs,
  fetcher,
  onError = () => undefined,
}: {
  database: Pool
  intervalMs: number
  retentionMs: number
  fetcher?: RealtimeFetch
  onError?: (error: unknown) => void
}): TtcVehicleCollector {
  let collecting = false
  let timer: NodeJS.Timeout | undefined
  let activeRun: Promise<void> | undefined

  async function runOnce() {
    if (collecting) return
    collecting = true
    activeRun = (async () => {
      try {
        const snapshot = await fetchTtcVehiclePositions(fetcher)
        const client = await database.connect()
        try {
          await persistVehicleSnapshot(client, snapshot, retentionMs)
        } finally {
          client.release()
        }
      } catch (error) {
        onError(error)
      } finally {
        collecting = false
      }
    })()
    try {
      await activeRun
    } finally {
      activeRun = undefined
    }
  }

  return {
    runOnce,
    start() {
      if (timer) return
      void runOnce()
      timer = setInterval(() => { void runOnce() }, intervalMs)
    },
    async stop() {
      if (timer) clearInterval(timer)
      timer = undefined
      await activeRun
    },
    isRunning: () => collecting,
  }
}
