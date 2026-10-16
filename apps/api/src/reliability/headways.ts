import type { Pool } from 'pg'
import { analyzePassages, createObservationPoint, passageLimits, type Observation, type Shape } from './passages.js'

export const featuredRouteIds = ['29', '35', '52', '54', '63', '75', '97', '501', '504']
export const observationRowLimit = 120_000

export async function getObservedHeadways(database: Pick<Pool, 'connect'>, routeIds: string[], now = new Date()) {
  const end = now.toISOString()
  const start = new Date(now.getTime() - 60 * 60_000).toISOString()
  const client = await database.connect()
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
    await client.query("SET LOCAL statement_timeout = '10s'")
    const shapes = await client.query<Shape>(
      `WITH shape_counts AS (
        SELECT t.route_id, t.direction_id, t.shape_id, count(*) AS trip_count
        FROM trips t
        JOIN feed_imports f ON f.feed_import_id = t.feed_import_id AND f.source_key = $1
        WHERE t.route_id = ANY($2::text[]) AND t.direction_id IN ('0', '1') AND t.shape_id IS NOT NULL
        GROUP BY t.route_id, t.direction_id, t.shape_id
      ), ranked AS (
        SELECT *, row_number() OVER (PARTITION BY route_id, direction_id ORDER BY trip_count DESC, shape_id COLLATE "C") AS rank
        FROM shape_counts
      )
      SELECT r.route_id AS "routeId", r.direction_id AS "directionId", r.shape_id AS "shapeId",
        json_agg(json_build_array(s.shape_pt_lon, s.shape_pt_lat) ORDER BY s.shape_pt_sequence) AS coordinates
      FROM ranked r
      JOIN feed_imports f ON f.source_key = $1
      JOIN shapes s ON s.feed_import_id = f.feed_import_id AND s.shape_id = r.shape_id
      WHERE r.rank = 1
      GROUP BY r.route_id, r.direction_id, r.shape_id ORDER BY r.route_id, r.direction_id`,
      ['ttc-surface', routeIds],
    )
    const snapshots = await client.query<{ snapshotCount: number; first: Date | null; last: Date | null; collectionTimes: Date[] | null }>(
      `SELECT count(*)::integer AS "snapshotCount", min(fetched_at) AS first, max(fetched_at) AS last, array_agg(fetched_at ORDER BY fetched_at) AS "collectionTimes" FROM (
        SELECT fetched_at FROM vehicle_position_snapshots
        WHERE source_key = $1 AND fetched_at >= $2 AND fetched_at <= $3
        ORDER BY fetched_at DESC LIMIT 62
      ) recent`, ['ttc-vehicle-positions', start, end],
    )
    const observations = await client.query<Omit<Observation, 'timestamp' | 'fetchedAt'> & { timestamp: string | null; fetchedAt: Date }>(
      `WITH recent AS (
        SELECT snapshot_id, fetched_at FROM vehicle_position_snapshots
        WHERE source_key = $1 AND fetched_at >= $2 AND fetched_at <= $3
        ORDER BY fetched_at DESC LIMIT 61
      )
      SELECT v.vehicle_id AS "vehicleId", v.source_timestamp AS timestamp, r.fetched_at AS "fetchedAt",
        v.reported_route_id AS "routeId", v.matched_surface_trip_id AS "tripId", v.direction_id AS "directionId",
        v.matched_surface_route_id AS "matchedRouteId", t.route_id AS "tripRouteId",
        t.direction_id AS "tripDirectionId", t.shape_id AS "shapeId", v.latitude, v.longitude
      FROM recent r JOIN vehicle_observations v ON v.snapshot_id = r.snapshot_id
      LEFT JOIN feed_imports f ON f.source_key = $4 AND r.fetched_at >= f.completed_at
      LEFT JOIN trips t ON t.feed_import_id = f.feed_import_id AND t.trip_id = v.matched_surface_trip_id
      WHERE v.reported_route_id = ANY($5::text[])
      LIMIT $6`, ['ttc-vehicle-positions', start, end, 'ttc-surface', routeIds, observationRowLimit + 1],
    )
    await client.query('COMMIT')
    const coverage = snapshots.rows[0]
    const capped = observations.rows.length > observationRowLimit || (coverage?.snapshotCount ?? 0) > 61
    const samples: Observation[] = observations.rows.map((row) => {
      const timestamp = row.timestamp === null ? null : Number(row.timestamp)
      return { ...row, timestamp: timestamp !== null && timestamp >= Date.parse(start) / 1000 && timestamp <= now.getTime() / 1000 ? timestamp : null, fetchedAt: row.fetchedAt.toISOString() }
    })
    const points = shapes.rows.flatMap((shape) => {
      const point = createObservationPoint(shape)
      return point ? [point] : []
    })
    const collectionTimes = coverage?.collectionTimes ?? []
    const coverageGaps: [number, number][] = []
    for (let index = 1; index < collectionTimes.length; index += 1) {
      const before = collectionTimes[index - 1].getTime() / 1000
      const after = collectionTimes[index].getTime() / 1000
      if (after - before > passageLimits.maxGapSeconds) coverageGaps.push([before, after])
    }
    const results = capped ? [] : points.map((point) => analyzePassages(point, samples, coverageGaps))
    return {
      status: results.some((result) => result.status === 'available') ? 'available' : 'insufficient_data',
      methodology: 'sample-bracket-headway-bounds-v1',
      window: { start, end },
      coverage: { snapshotCount: coverage?.snapshotCount ?? 0, firstCollectedAt: coverage?.first?.toISOString() ?? null, lastCollectedAt: coverage?.last?.toISOString() ?? null, sampleCount: samples.length, gapCount: coverageGaps.length, capped },
      limits: passageLimits,
      results,
      unavailableRoutes: routeIds.filter((routeId) => !points.some((point) => point.routeId === routeId)),
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
