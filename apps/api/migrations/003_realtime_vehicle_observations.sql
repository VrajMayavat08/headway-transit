CREATE TABLE vehicle_position_snapshots (
  snapshot_id UUID PRIMARY KEY,
  source_key TEXT NOT NULL CHECK (source_key = 'ttc-vehicle-positions'),
  feed_timestamp BIGINT,
  fetched_at TIMESTAMPTZ NOT NULL,
  vehicle_count INTEGER NOT NULL CHECK (vehicle_count >= 0),
  UNIQUE NULLS NOT DISTINCT (source_key, feed_timestamp)
);

CREATE INDEX vehicle_position_snapshots_latest_idx ON vehicle_position_snapshots (source_key, fetched_at DESC);

CREATE TABLE vehicle_observations (
  observation_id BIGSERIAL PRIMARY KEY,
  snapshot_id UUID NOT NULL REFERENCES vehicle_position_snapshots (snapshot_id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL,
  vehicle_id TEXT,
  source_timestamp BIGINT,
  reported_route_id TEXT,
  reported_trip_id TEXT,
  reported_stop_id TEXT,
  matched_surface_route_id TEXT,
  matched_surface_trip_id TEXT,
  matched_surface_stop_id TEXT,
  direction_id INTEGER,
  current_stop_sequence INTEGER,
  bearing DOUBLE PRECISION,
  speed_meters_per_second DOUBLE PRECISION,
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  geometry geometry(Point, 4326) NOT NULL,
  UNIQUE (snapshot_id, entity_id)
);

CREATE INDEX vehicle_observations_snapshot_idx ON vehicle_observations (snapshot_id);
CREATE INDEX vehicle_observations_vehicle_timestamp_idx ON vehicle_observations (vehicle_id, source_timestamp DESC);
CREATE INDEX vehicle_observations_matched_trip_idx ON vehicle_observations (matched_surface_trip_id) WHERE matched_surface_trip_id IS NOT NULL;
CREATE INDEX vehicle_observations_geometry_idx ON vehicle_observations USING GIST (geometry);
