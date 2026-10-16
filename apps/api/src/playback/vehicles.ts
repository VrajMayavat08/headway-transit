import type { Pool } from 'pg'

export const playbackLimits = { toleranceSeconds: 90, maxSnapshots: 2000, maxVehicles: 3000 }
const sourceKey = 'ttc-vehicle-positions'

export type PlaybackVehicle = {
  entityId: string
  vehicleId: string | null
  sourceTimestamp: number | null
  reportedRouteId: string | null
  reportedTripId: string | null
  latitude: number
  longitude: number
}
type Snapshot = { snapshotId: string; fetchedAt: Date; feedTimestamp: string | null; vehicleCount: number }

export async function getPlaybackVehicles(database: Pick<Pool, 'connect'>, timestamp: string, routeId: string | undefined, retentionMs: number, now = new Date()) {
  const requested = new Date(timestamp)
  const cutoff = new Date(now.getTime() - retentionMs)
  const client = await database.connect()
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
    await client.query("SET LOCAL statement_timeout = '5s'")
    const catalog = await client.query<{ fetchedAt: Date }>(
      `SELECT fetched_at AS "fetchedAt" FROM vehicle_position_snapshots
       WHERE source_key = $1 AND fetched_at >= $2 AND fetched_at <= $3
       ORDER BY fetched_at DESC LIMIT $4`,
      [sourceKey, cutoff, now, playbackLimits.maxSnapshots + 1],
    )
    const times = catalog.rows.slice(0, playbackLimits.maxSnapshots).reverse().map((row) => row.fetchedAt.toISOString())
    const base = {
      requestedAt: requested.toISOString(), routeId: routeId ?? null,
      toleranceSeconds: playbackLimits.toleranceSeconds,
      retention: { start: cutoff.toISOString(), end: now.toISOString() },
      window: { start: times[0] ?? null, end: times[times.length - 1] ?? null },
      timeline: times,
      timelineTruncated: catalog.rows.length > playbackLimits.maxSnapshots,
    }
    const empty = { snapshot: null, observations: [] as PlaybackVehicle[], observationsTruncated: false }
    if (requested < cutoff) {
      await client.query('COMMIT')
      return { ...base, ...empty, status: 'outside_retention' as const }
    }
    if (requested > now) {
      await client.query('COMMIT')
      return { ...base, ...empty, status: 'no_data' as const }
    }
    // Two bounded index walks, then compare only their nearest candidates. Ties choose earlier collection.
    const candidates = await client.query<Snapshot>(
      `SELECT * FROM (
        (SELECT snapshot_id AS "snapshotId", fetched_at AS "fetchedAt", feed_timestamp AS "feedTimestamp", vehicle_count AS "vehicleCount"
         FROM vehicle_position_snapshots
         WHERE source_key = $1 AND fetched_at >= $2 AND fetched_at <= $3 ORDER BY fetched_at DESC LIMIT 1)
        UNION ALL
        (SELECT snapshot_id AS "snapshotId", fetched_at AS "fetchedAt", feed_timestamp AS "feedTimestamp", vehicle_count AS "vehicleCount"
         FROM vehicle_position_snapshots
         WHERE source_key = $1 AND fetched_at >= $3 AND fetched_at <= $4 ORDER BY fetched_at ASC LIMIT 1)
      ) candidates ORDER BY abs(extract(epoch FROM ("fetchedAt" - $3::timestamptz))), "fetchedAt", "snapshotId" LIMIT 1`,
      [sourceKey, new Date(Math.max(cutoff.getTime(), requested.getTime() - playbackLimits.toleranceSeconds * 1000)), requested,
        new Date(Math.min(now.getTime(), requested.getTime() + playbackLimits.toleranceSeconds * 1000))],
    )
    const snapshot = candidates.rows[0]
    if (!snapshot) {
      await client.query('COMMIT')
      return { ...base, ...empty, status: 'no_data' as const }
    }
    const vehicles = await client.query<Omit<PlaybackVehicle, 'sourceTimestamp'> & { sourceTimestamp: string | null }>(
      `SELECT entity_id AS "entityId", vehicle_id AS "vehicleId", source_timestamp AS "sourceTimestamp",
        reported_route_id AS "reportedRouteId", reported_trip_id AS "reportedTripId", latitude, longitude
       FROM vehicle_observations WHERE snapshot_id = $1${routeId === undefined ? '' : ' AND reported_route_id = $3'}
       ORDER BY entity_id LIMIT $2`,
      routeId === undefined ? [snapshot.snapshotId, playbackLimits.maxVehicles + 1] : [snapshot.snapshotId, playbackLimits.maxVehicles + 1, routeId],
    )
    await client.query('COMMIT')
    return {
      ...base, status: 'available' as const,
      snapshot: { snapshotId: snapshot.snapshotId, fetchedAt: snapshot.fetchedAt.toISOString(), feedTimestamp: snapshot.feedTimestamp === null ? null : Number(snapshot.feedTimestamp), vehicleCount: snapshot.vehicleCount },
      observations: vehicles.rows.slice(0, playbackLimits.maxVehicles).map((row): PlaybackVehicle => ({ ...row, sourceTimestamp: row.sourceTimestamp === null ? null : Number(row.sourceTimestamp) })),
      observationsTruncated: vehicles.rows.length > playbackLimits.maxVehicles,
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
