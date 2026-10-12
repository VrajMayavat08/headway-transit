import type { PoolClient } from 'pg'

const dependentTables = [
  // Deleting trips cascades to stop_times. Deleting stop_times first leaves dead
  // child index entries that every subsequent trip cascade must inspect.
  'trips',
  'shapes',
  'calendar_dates',
  'calendar',
  'routes',
  'stops',
  'agencies',
] as const

export async function deleteFeedSnapshot(client: PoolClient, sourceKey: string) {
  for (const table of dependentTables) {
    await client.query(
      `DELETE FROM ${table} WHERE feed_import_id IN (SELECT feed_import_id FROM feed_imports WHERE source_key = $1)`,
      [sourceKey],
    )
  }
  await client.query('DELETE FROM feed_imports WHERE source_key = $1', [sourceKey])
}
