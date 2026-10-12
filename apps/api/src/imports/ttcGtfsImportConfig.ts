import { resolve } from 'node:path'

export const TTC_STATIC_SOURCE_KEY = 'ttc-static'
export const TTC_SURFACE_SOURCE_KEY = 'ttc-surface'

export type TtcGtfsImportConfiguration = {
  sourceKey: typeof TTC_STATIC_SOURCE_KEY | typeof TTC_SURFACE_SOURCE_KEY
  archivePath: string
  archiveFilename: string
}

export function resolveTtcGtfsImportConfiguration(arguments_: string[], repositoryRoot: string): TtcGtfsImportConfiguration {
  if (arguments_.length === 0) {
    return {
      sourceKey: TTC_STATIC_SOURCE_KEY,
      archivePath: resolve(repositoryRoot, 'data/imports/ttc-static-gtfs.zip'),
      archiveFilename: 'ttc-static-gtfs.zip',
    }
  }

  if (arguments_.length === 1 && arguments_[0] === '--surface') {
    return {
      sourceKey: TTC_SURFACE_SOURCE_KEY,
      archivePath: resolve(repositoryRoot, 'data/imports/ttc-surface-gtfs.zip'),
      archiveFilename: 'ttc-surface-gtfs.zip',
    }
  }

  throw new Error('Usage: import:ttc-gtfs [--surface]')
}
