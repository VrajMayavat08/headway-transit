import { randomUUID } from 'node:crypto'
import type { Pool, PoolClient } from 'pg'
import { TTC_SURFACE_SOURCE_KEY } from '../imports/ttcGtfsImportConfig.js'
import type { TtcVehiclePosition, TtcVehiclePositionSnapshot } from './ttcVehiclePositions.js'

const TTC_VEHICLE_SOURCE_KEY = 'ttc-vehicle-positions'

export type SurfaceIdentifiers = {
  routeIds: Set<string>
  tripIds: Set<string>
  stopIds: Set<string>
}

export type MatchedVehiclePosition = TtcVehiclePosition & {
  matchedSurfaceRouteId: string | null
  matchedSurfaceTripId: string | null
  matchedSurfaceStopId: string | null
}

export type PersistResult = {
  inserted: boolean
  snapshotId: string | null
  observationCount: number
}

function identifiers(values: Array<string | null>) {
  return [...new Set(values.filter((value): value is string => value !== null))]
}

export function matchSurfaceIdentifiers(vehicles: TtcVehiclePosition[], surface: SurfaceIdentifiers): MatchedVehiclePosition[] {
  return vehicles.map((vehicle) => ({
    ...vehicle,
    matchedSurfaceRouteId: vehicle.routeId && surface.routeIds.has(vehicle.routeId) ? vehicle.routeId : null,
    matchedSurfaceTripId: vehicle.tripId && surface.tripIds.has(vehicle.tripId) ? vehicle.tripId : null,
    matchedSurfaceStopId: vehicle.stopId && surface.stopIds.has(vehicle.stopId) ? vehicle.stopId : null,
  }))
}

async function findSurfaceIdentifiers(client: PoolClient, vehicles: TtcVehiclePosition[]): Promise<SurfaceIdentifiers> {
  // pg clients execute one transaction at a time; concurrent client.query calls trigger a deprecation warning.
  const routes = await client.query<{ routeId: string }>('SELECT route_id AS "routeId" FROM routes WHERE feed_import_id = (SELECT feed_import_id FROM feed_imports WHERE source_key = $1) AND route_id = ANY($2::text[])', [TTC_SURFACE_SOURCE_KEY, identifiers(vehicles.map((vehicle) => vehicle.routeId))])
  const trips = await client.query<{ tripId: string }>('SELECT trip_id AS "tripId" FROM trips WHERE feed_import_id = (SELECT feed_import_id FROM feed_imports WHERE source_key = $1) AND trip_id = ANY($2::text[])', [TTC_SURFACE_SOURCE_KEY, identifiers(vehicles.map((vehicle) => vehicle.tripId))])
  const stops = await client.query<{ stopId: string }>('SELECT stop_id AS "stopId" FROM stops WHERE feed_import_id = (SELECT feed_import_id FROM feed_imports WHERE source_key = $1) AND stop_id = ANY($2::text[])', [TTC_SURFACE_SOURCE_KEY, identifiers(vehicles.map((vehicle) => vehicle.stopId))])

  return {
    routeIds: new Set(routes.rows.map((row) => row.routeId)),
    tripIds: new Set(trips.rows.map((row) => row.tripId)),
    stopIds: new Set(stops.rows.map((row) => row.stopId)),
  }
}

async function insertVehicles(client: PoolClient, snapshotId: string, vehicles: MatchedVehiclePosition[]) {
  if (vehicles.length === 0) return
  const columns = ['snapshot_id', 'entity_id', 'vehicle_id', 'source_timestamp', 'reported_route_id', 'reported_trip_id', 'reported_stop_id', 'matched_surface_route_id', 'matched_surface_trip_id', 'matched_surface_stop_id', 'direction_id', 'current_stop_sequence', 'bearing', 'speed_meters_per_second', 'latitude', 'longitude', 'geometry']
  const values: unknown[] = []
  const placeholders = vehicles.map((vehicle) => {
    const row = [snapshotId, vehicle.entityId, vehicle.vehicleId, vehicle.timestamp, vehicle.routeId, vehicle.tripId, vehicle.stopId, vehicle.matchedSurfaceRouteId, vehicle.matchedSurfaceTripId, vehicle.matchedSurfaceStopId, vehicle.directionId, vehicle.currentStopSequence, vehicle.bearing, vehicle.speedMetersPerSecond, vehicle.latitude, vehicle.longitude, `POINT(${vehicle.longitude} ${vehicle.latitude})`]
    return `(${row.map((value, index) => {
      values.push(value)
      const placeholder = `$${values.length}`
      return columns[index] === 'geometry' ? `ST_GeomFromText(${placeholder}, 4326)` : placeholder
    }).join(', ')})`
  }).join(', ')
  await client.query(`INSERT INTO vehicle_observations (${columns.join(', ')}) VALUES ${placeholders}`, values)
}

export async function persistVehicleSnapshot(client: PoolClient, snapshot: TtcVehiclePositionSnapshot, retentionMs: number): Promise<PersistResult> {
  await client.query('BEGIN')
  try {
    const snapshotId = randomUUID()
    const insertedSnapshot = await client.query<{ snapshotId: string }>(
      `INSERT INTO vehicle_position_snapshots (snapshot_id, source_key, feed_timestamp, fetched_at, vehicle_count)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (source_key, feed_timestamp) DO NOTHING
       RETURNING snapshot_id AS "snapshotId"`,
      [snapshotId, TTC_VEHICLE_SOURCE_KEY, snapshot.feedTimestamp, snapshot.fetchedAt, snapshot.vehicles.length],
    )
    const persistedSnapshotId = insertedSnapshot.rows[0]?.snapshotId
    if (!persistedSnapshotId) {
      await client.query('COMMIT')
      return { inserted: false, snapshotId: null, observationCount: 0 }
    }

    const surface = await findSurfaceIdentifiers(client, snapshot.vehicles)
    const vehicles = matchSurfaceIdentifiers(snapshot.vehicles, surface)
    await insertVehicles(client, persistedSnapshotId, vehicles)
    await client.query(
      'DELETE FROM vehicle_position_snapshots WHERE source_key = $1 AND fetched_at < $2',
      [TTC_VEHICLE_SOURCE_KEY, new Date(new Date(snapshot.fetchedAt).getTime() - retentionMs)],
    )
    await client.query('COMMIT')
    return { inserted: true, snapshotId: persistedSnapshotId, observationCount: vehicles.length }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
}

export type LatestVehicleObservation = {
  entityId: string
  vehicleId: string | null
  sourceTimestamp: number | null
  reportedRouteId: string | null
  reportedTripId: string | null
  reportedStopId: string | null
  matchedSurfaceRouteId: string | null
  matchedSurfaceTripId: string | null
  matchedSurfaceStopId: string | null
  latitude: number
  longitude: number
  directionId: number | null
  currentStopSequence: number | null
  bearing: number | null
  speedMetersPerSecond: number | null
}

export type LatestVehicleResponse = {
  status: 'empty' | 'current' | 'stale'
  snapshot: { fetchedAt: string; feedTimestamp: number | null; vehicleCount: number } | null
  observations: LatestVehicleObservation[]
}

type SnapshotRow = { snapshotId: string; fetchedAt: Date; feedTimestamp: string | null; vehicleCount: number }
type ObservationRow = Omit<LatestVehicleObservation, 'sourceTimestamp'> & { sourceTimestamp: string | null }

export async function getLatestVehicleObservations(database: Pick<Pool, 'query'>, staleAfterMs: number, now = Date.now): Promise<LatestVehicleResponse> {
  const snapshotResult = await database.query<SnapshotRow>(
    `SELECT snapshot_id AS "snapshotId", fetched_at AS "fetchedAt", feed_timestamp AS "feedTimestamp", vehicle_count AS "vehicleCount"
     FROM vehicle_position_snapshots WHERE source_key = $1 ORDER BY fetched_at DESC LIMIT 1`,
    [TTC_VEHICLE_SOURCE_KEY],
  )
  const snapshot = snapshotResult.rows[0]
  if (!snapshot) return { status: 'empty', snapshot: null, observations: [] }

  const observations = await database.query<ObservationRow>(
    `SELECT entity_id AS "entityId", vehicle_id AS "vehicleId", source_timestamp AS "sourceTimestamp",
      reported_route_id AS "reportedRouteId", reported_trip_id AS "reportedTripId", reported_stop_id AS "reportedStopId",
      matched_surface_route_id AS "matchedSurfaceRouteId", matched_surface_trip_id AS "matchedSurfaceTripId", matched_surface_stop_id AS "matchedSurfaceStopId",
      latitude, longitude, direction_id AS "directionId", current_stop_sequence AS "currentStopSequence", bearing,
      speed_meters_per_second AS "speedMetersPerSecond"
     FROM vehicle_observations WHERE snapshot_id = $1 ORDER BY entity_id`,
    [snapshot.snapshotId],
  )
  const fetchedAt = snapshot.fetchedAt.toISOString()
  return {
    status: now() - snapshot.fetchedAt.getTime() > staleAfterMs ? 'stale' : 'current',
    snapshot: { fetchedAt, feedTimestamp: snapshot.feedTimestamp === null ? null : Number(snapshot.feedTimestamp), vehicleCount: snapshot.vehicleCount },
    observations: observations.rows.map((row) => ({ ...row, sourceTimestamp: row.sourceTimestamp === null ? null : Number(row.sourceTimestamp) })),
  }
}
