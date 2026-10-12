import type { Pool } from 'pg'

const TTC_SOURCE_KEY = 'ttc-static'

export interface ScheduleRouteStop {
  stopId: string
  stopName: string | null
  latitude: number
  longitude: number
  sequence: number
}

export interface ScheduleRouteStopPattern {
  directionId: string | null
  tripId: string
  headsign: string | null
  tripCount: number
  stops: ScheduleRouteStop[]
}

export interface ScheduleRouteStops {
  routeId: string
  patterns: ScheduleRouteStopPattern[]
}

type RouteStopRow = Omit<ScheduleRouteStop, 'sequence'> & {
  directionId: string | null
  tripId: string
  headsign: string | null
  tripCount: number
  sequence: number
}

export async function getTtcRouteStops(database: Pick<Pool, 'query'>, routeId: string): Promise<ScheduleRouteStops> {
  const result = await database.query<RouteStopRow>(
    `WITH current_feed AS (
      SELECT feed_import_id
      FROM feed_imports
      WHERE source_key = $1
    ), trip_patterns AS (
      SELECT
        t.direction_id,
        COALESCE(t.direction_id, '') AS direction_key,
        t.trip_id,
        t.trip_headsign,
        array_agg(st.stop_id ORDER BY st.stop_sequence) AS stop_pattern,
        count(*)::integer AS stop_count
      FROM trips t
      JOIN current_feed f ON f.feed_import_id = t.feed_import_id
      JOIN stop_times st ON st.feed_import_id = t.feed_import_id AND st.trip_id = t.trip_id
      WHERE t.route_id = $2
      GROUP BY t.direction_id, t.trip_id, t.trip_headsign
    ), pattern_frequency AS (
      SELECT
        direction_key,
        stop_pattern,
        count(*)::integer AS trip_count
      FROM trip_patterns
      GROUP BY direction_key, stop_pattern
    ), ranked_patterns AS (
      SELECT
        tp.direction_id,
        tp.direction_key,
        tp.trip_id,
        tp.trip_headsign,
        pf.trip_count,
        row_number() OVER (
          PARTITION BY tp.direction_key
          ORDER BY pf.trip_count DESC, tp.stop_count DESC, tp.trip_id ASC
        ) AS pattern_rank
      FROM trip_patterns tp
      JOIN pattern_frequency pf
        ON pf.direction_key = tp.direction_key
        AND pf.stop_pattern = tp.stop_pattern
    )
    SELECT
      rp.direction_id AS "directionId",
      rp.trip_id AS "tripId",
      rp.trip_headsign AS headsign,
      rp.trip_count AS "tripCount",
      st.stop_id AS "stopId",
      s.stop_name AS "stopName",
      s.stop_lat AS latitude,
      s.stop_lon AS longitude,
      st.stop_sequence AS sequence
    FROM ranked_patterns rp
    JOIN current_feed f ON true
    JOIN stop_times st ON st.feed_import_id = f.feed_import_id AND st.trip_id = rp.trip_id
    JOIN stops s ON s.feed_import_id = st.feed_import_id AND s.stop_id = st.stop_id
    WHERE rp.pattern_rank = 1
    ORDER BY rp.direction_key, st.stop_sequence`,
    [TTC_SOURCE_KEY, routeId],
  )

  const patterns = new Map<string, ScheduleRouteStopPattern>()
  for (const row of result.rows) {
    const patternKey = `${row.directionId ?? ''}:${row.tripId}`
    const pattern = patterns.get(patternKey) ?? {
      directionId: row.directionId,
      tripId: row.tripId,
      headsign: row.headsign,
      tripCount: row.tripCount,
      stops: [],
    }
    pattern.stops.push({
      stopId: row.stopId,
      stopName: row.stopName,
      latitude: row.latitude,
      longitude: row.longitude,
      sequence: row.sequence,
    })
    patterns.set(patternKey, pattern)
  }

  return { routeId, patterns: [...patterns.values()] }
}
