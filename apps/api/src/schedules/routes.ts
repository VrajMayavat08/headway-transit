import type { Pool } from 'pg'

const TTC_SOURCE_KEY = 'ttc-static'

export interface ScheduleRoute {
  routeId: string
  shortName: string | null
  longName: string | null
  routeType: string
  color: string | null
}

export async function listTtcRoutes(database: Pick<Pool, 'query'>): Promise<ScheduleRoute[]> {
  const result = await database.query<ScheduleRoute>(
    `SELECT
      route_id AS "routeId",
      route_short_name AS "shortName",
      route_long_name AS "longName",
      route_type AS "routeType",
      route_color AS color
    FROM routes
    WHERE feed_import_id = (
      SELECT feed_import_id
      FROM feed_imports
      WHERE source_key = $1
    )
    ORDER BY
      NULLIF(substring(route_short_name FROM '^[0-9]+'), '')::integer NULLS LAST,
      substring(route_short_name FROM '[^0-9].*$') COLLATE "C" NULLS LAST,
      route_short_name COLLATE "C" NULLS LAST,
      route_id COLLATE "C"`,
    [TTC_SOURCE_KEY],
  )

  return result.rows
}
