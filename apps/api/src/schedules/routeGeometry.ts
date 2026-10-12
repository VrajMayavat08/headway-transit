import type { Pool } from 'pg'

const TTC_SOURCE_KEY = 'ttc-static'

export interface ScheduleRouteGeometryFeature {
  type: 'Feature'
  properties: {
    routeId: string
    directionId: string | null
    shapeId: string
    tripId: string
    tripCount: number
  }
  geometry: {
    type: 'LineString'
    coordinates: [number, number][]
  }
}

export interface ScheduleRouteGeometry {
  type: 'FeatureCollection'
  features: ScheduleRouteGeometryFeature[]
}

type RouteGeometryRow = {
  routeId: string
  directionId: string | null
  shapeId: string
  tripId: string
  tripCount: number
  longitude: number
  latitude: number
}

export async function getTtcRouteGeometry(database: Pick<Pool, 'query'>, routeId: string): Promise<ScheduleRouteGeometry> {
  const result = await database.query<RouteGeometryRow>(
    `WITH current_feed AS (
      SELECT feed_import_id
      FROM feed_imports
      WHERE source_key = $1
    ), representative_shapes AS (
      SELECT
        t.route_id,
        t.direction_id,
        COALESCE(t.direction_id, '') AS direction_key,
        t.shape_id,
        min(t.trip_id) AS trip_id,
        count(*)::integer AS trip_count
      FROM trips t
      JOIN current_feed f ON f.feed_import_id = t.feed_import_id
      WHERE t.route_id = $2
        AND t.shape_id IS NOT NULL
      GROUP BY t.route_id, t.direction_id, t.shape_id
    )
    SELECT
      rs.route_id AS "routeId",
      rs.direction_id AS "directionId",
      rs.shape_id AS "shapeId",
      rs.trip_id AS "tripId",
      rs.trip_count AS "tripCount",
      s.shape_pt_lon AS longitude,
      s.shape_pt_lat AS latitude
    FROM representative_shapes rs
    JOIN current_feed f ON true
    JOIN shapes s ON s.feed_import_id = f.feed_import_id AND s.shape_id = rs.shape_id
    ORDER BY rs.direction_key, rs.shape_id, s.shape_pt_sequence`,
    [TTC_SOURCE_KEY, routeId],
  )

  const features = new Map<string, ScheduleRouteGeometryFeature>()
  for (const row of result.rows) {
    const featureKey = `${row.directionId ?? ''}:${row.shapeId}`
    const feature = features.get(featureKey) ?? {
      type: 'Feature',
      properties: {
        routeId: row.routeId,
        directionId: row.directionId,
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
