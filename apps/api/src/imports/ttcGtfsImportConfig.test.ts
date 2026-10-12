import assert from 'node:assert/strict'
import test from 'node:test'
import { resolve } from 'node:path'
import { resolveTtcGtfsImportConfiguration, TTC_STATIC_SOURCE_KEY, TTC_SURFACE_SOURCE_KEY } from './ttcGtfsImportConfig.js'

test('uses the existing static archive and source key by default', () => {
  const configuration = resolveTtcGtfsImportConfiguration([], '/headway')
  assert.equal(configuration.sourceKey, TTC_STATIC_SOURCE_KEY)
  assert.equal(configuration.archivePath, resolve('/headway', 'data/imports/ttc-static-gtfs.zip'))
})

test('uses an isolated source key and local archive for SurfaceGTFS', () => {
  const configuration = resolveTtcGtfsImportConfiguration(['--surface'], '/headway')
  assert.equal(configuration.sourceKey, TTC_SURFACE_SOURCE_KEY)
  assert.equal(configuration.archivePath, resolve('/headway', 'data/imports/ttc-surface-gtfs.zip'))
})

test('rejects unscoped import arguments', () => {
  assert.throws(() => resolveTtcGtfsImportConfiguration(['--surface', '--unexpected'], '/headway'), /Usage/)
})
