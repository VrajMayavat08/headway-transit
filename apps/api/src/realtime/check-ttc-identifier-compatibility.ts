import { access, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkTtcIdentifierCompatibility, TTC_SURFACE_GTFS_URL } from './ttcIdentifierCompatibility.js'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = resolve(scriptDirectory, '../../../../')
const surfaceArchivePath = resolve(repositoryRoot, 'data/imports/ttc-surface-gtfs.zip')
const existingStaticArchivePath = resolve(repositoryRoot, 'data/imports/ttc-static-gtfs.zip')

async function downloadSurfaceGtfs() {
  const response = await fetch(TTC_SURFACE_GTFS_URL)
  if (!response.ok) throw new Error(`SurfaceGTFS download failed: ${response.status} ${response.statusText}`)
  await writeFile(surfaceArchivePath, new Uint8Array(await response.arrayBuffer()))
}

async function main() {
  if (process.argv.includes('--download-surface')) await downloadSurfaceGtfs()
  await Promise.all([access(surfaceArchivePath), access(existingStaticArchivePath)])
  const report = await checkTtcIdentifierCompatibility({ surfaceArchivePath, existingStaticArchivePath })
  console.log(JSON.stringify({
    fetchedAt: report.fetchedAt,
    vehicleCount: report.vehicleCount,
    vehiclesWithRouteId: report.vehiclesWithRouteId,
    vehiclesWithTripId: report.vehiclesWithTripId,
    vehiclesWithStopId: report.vehiclesWithStopId,
    surfaceGtfs: report.surfaceGtfs,
    existingStaticGtfs: report.existingStaticGtfs,
  }, null, 2))
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
