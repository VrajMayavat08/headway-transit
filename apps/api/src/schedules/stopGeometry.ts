import type { Pool } from 'pg'

const TTC_SOURCE_KEY = 'ttc-static'

type StopGeometryRow = {
  routeId: string
  routeShortName: string | null
  routeLongName: string | null
  directionId: string | null
  headsign: string | null
  shapeId: string
  tripId: string
  tripCount: number
  longitude: number
  latitude: number
}

export type StopServingGeometryFeature = {
  type: 'Feature'
  properties: {
    routeId: string
    routeShortName: string | null
    routeLongName: string | null
    directionId: string | null
    headsign: string | null
    shapeId: string
    tripId: string
    tripCount: number
  }
  geometry: { type: 'LineString'; coordinates: Array<[number, number]> }
}

export type StopServingGeometry = {
  type: 'FeatureCollection'
  features: StopServingGeometryFeature[]
}

export async function getTtcStopServingGeometry(database: Pick<Pool, 'query'>, stopId: string): Promise<StopServingGeometry> {
  const result = await database.query<StopGeometryRow>(
    `WITH current_feed AS (
      SELECT feed_import_id
      FROM feed_imports
      WHERE source_key = $1
    ), serving_shapes AS (
      SELECT
        t.route_id,
        t.direction_id,
        COALESCE(t.direction_id, '') AS direction_key,
        t.shape_id,
        min(t.trip_id) AS trip_id,
        count(*)::integer AS trip_count
      FROM trips t
      JOIN current_feed f ON f.feed_import_id = t.feed_import_id
      JOIN stop_times st ON st.feed_import_id = t.feed_import_id AND st.trip_id = t.trip_id
      WHERE st.stop_id = $2
        AND t.shape_id IS NOT NULL
      GROUP BY t.route_id, t.direction_id, t.shape_id
    ), ranked_shapes AS (
      SELECT
        *,
        -- Keep one common, stop-serving shape for each real route direction.
        row_number() OVER (
          PARTITION BY route_id, direction_key
          ORDER BY trip_count DESC, shape_id ASC
        ) AS shape_rank
      FROM serving_shapes
    )
    SELECT
      rs.route_id AS "routeId",
      r.route_short_name AS "routeShortName",
      r.route_long_name AS "routeLongName",
      rs.direction_id AS "directionId",
      t.trip_headsign AS headsign,
      rs.shape_id AS "shapeId",
      rs.trip_id AS "tripId",
      rs.trip_count AS "tripCount",
      s.shape_pt_lon AS longitude,
      s.shape_pt_lat AS latitude
    FROM ranked_shapes rs
    JOIN current_feed f ON true
    JOIN trips t ON t.feed_import_id = f.feed_import_id AND t.trip_id = rs.trip_id
    JOIN routes r ON r.feed_import_id = f.feed_import_id AND r.route_id = rs.route_id
    JOIN shapes s ON s.feed_import_id = f.feed_import_id AND s.shape_id = rs.shape_id
    WHERE rs.shape_rank = 1
    ORDER BY rs.route_id, rs.direction_key, rs.shape_id, s.shape_pt_sequence`,
    [TTC_SOURCE_KEY, stopId],
  )

  const features = new Map<string, StopServingGeometryFeature>()
  for (const row of result.rows) {
    const featureKey = `${row.routeId}:${row.directionId ?? ''}:${row.shapeId}`
    const feature = features.get(featureKey) ?? {
      type: 'Feature',
      properties: {
        routeId: row.routeId,
        routeShortName: row.routeShortName,
        routeLongName: row.routeLongName,
        directionId: row.directionId,
        headsign: row.headsign,
        shapeId: row.shapeId,
        tripId: row.tripId,
        tripCount: row.tripCount,
      },
      geometry: { type: 'LineString', coordinates: [] },
    }
    feature.geometry.coordinates.push([row.longitude, row.latitude])
    features.set(featureKey, feature)
  }

  return {
    type: 'FeatureCollection',
    features: [...features.values()].filter((feature) => feature.geometry.coordinates.length >= 2),
  }
}
