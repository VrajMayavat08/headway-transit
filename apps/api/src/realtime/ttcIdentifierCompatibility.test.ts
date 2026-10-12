import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import AdmZip from 'adm-zip'
import { matchLiveIdentifiers, readGtfsIdentifierSets } from './ttcIdentifierCompatibility.js'

test('reads route and trip identifiers from a GTFS archive and reports live match rates independently', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'headway-gtfs-identifiers-'))
  const archivePath = join(directory, 'surface.zip')
  const archive = new AdmZip()
  archive.addFile('routes.txt', Buffer.from('route_id,route_short_name\n29,29\n501,501\n'))
  archive.addFile('trips.txt', Buffer.from('route_id,service_id,trip_id\n29,weekday,trip-a\n501,weekday,trip-b\n'))
  archive.addFile('stops.txt', Buffer.from('stop_id,stop_name\n100,Example stop\n'))
  await writeFile(archivePath, archive.toBuffer())

  try {
    const identifiers = await readGtfsIdentifierSets(archivePath)
    assert.deepEqual([...identifiers.routeIds].sort(), ['29', '501'])
    assert.deepEqual([...identifiers.tripIds].sort(), ['trip-a', 'trip-b'])
    assert.deepEqual([...identifiers.stopIds], ['100'])
    assert.deepEqual(matchLiveIdentifiers(new Set(['29', '999']), identifiers.routeIds), {
      liveIdentifierCount: 2,
      matchedIdentifierCount: 1,
      matchPercent: 50,
    })
    assert.deepEqual(matchLiveIdentifiers(new Set<string>(), identifiers.tripIds), {
      liveIdentifierCount: 0,
      matchedIdentifierCount: 0,
      matchPercent: null,
    })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
