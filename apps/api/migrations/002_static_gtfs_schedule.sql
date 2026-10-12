CREATE TABLE feed_imports (
  feed_import_id UUID PRIMARY KEY,
  source_key TEXT NOT NULL,
  source_filename TEXT NOT NULL,
  source_checksum TEXT NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  row_counts JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX feed_imports_source_key_idx ON feed_imports (source_key);

CREATE TABLE agencies (
  feed_import_id UUID NOT NULL REFERENCES feed_imports (feed_import_id) ON DELETE CASCADE,
  agency_id TEXT NOT NULL,
  agency_name TEXT NOT NULL,
  agency_url TEXT NOT NULL,
  agency_timezone TEXT NOT NULL,
  agency_lang TEXT,
  agency_phone TEXT,
  agency_fare_url TEXT,
  agency_email TEXT,
  PRIMARY KEY (feed_import_id, agency_id)
);

CREATE TABLE routes (
  feed_import_id UUID NOT NULL REFERENCES feed_imports (feed_import_id) ON DELETE CASCADE,
  route_id TEXT NOT NULL,
  agency_id TEXT,
  route_short_name TEXT,
  route_long_name TEXT,
  route_desc TEXT,
  route_type TEXT NOT NULL,
  route_url TEXT,
  route_color TEXT,
  route_text_color TEXT,
  route_sort_order TEXT,
  continuous_pickup TEXT,
  continuous_drop_off TEXT,
  PRIMARY KEY (feed_import_id, route_id)
);

CREATE TABLE stops (
  feed_import_id UUID NOT NULL REFERENCES feed_imports (feed_import_id) ON DELETE CASCADE,
  stop_id TEXT NOT NULL,
  stop_code TEXT,
  stop_name TEXT,
  stop_desc TEXT,
  stop_lat DOUBLE PRECISION NOT NULL,
  stop_lon DOUBLE PRECISION NOT NULL,
  zone_id TEXT,
  stop_url TEXT,
  location_type TEXT,
  parent_station TEXT,
  stop_timezone TEXT,
  wheelchair_boarding TEXT,
  level_id TEXT,
  platform_code TEXT,
  geometry geometry(Point, 4326) NOT NULL,
  PRIMARY KEY (feed_import_id, stop_id)
);

CREATE INDEX stops_geometry_idx ON stops USING GIST (geometry);

CREATE TABLE shapes (
  feed_import_id UUID NOT NULL REFERENCES feed_imports (feed_import_id) ON DELETE CASCADE,
  shape_id TEXT NOT NULL,
  shape_pt_sequence INTEGER NOT NULL,
  shape_pt_lat DOUBLE PRECISION NOT NULL,
  shape_pt_lon DOUBLE PRECISION NOT NULL,
  shape_dist_traveled TEXT,
  geometry geometry(Point, 4326) NOT NULL,
  PRIMARY KEY (feed_import_id, shape_id, shape_pt_sequence)
);

CREATE INDEX shapes_geometry_idx ON shapes USING GIST (geometry);
CREATE INDEX shapes_feed_shape_idx ON shapes (feed_import_id, shape_id, shape_pt_sequence);

CREATE TABLE trips (
  feed_import_id UUID NOT NULL,
  route_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  trip_id TEXT NOT NULL,
  trip_headsign TEXT,
  trip_short_name TEXT,
  direction_id TEXT,
  block_id TEXT,
  shape_id TEXT,
  wheelchair_accessible TEXT,
  bikes_allowed TEXT,
  PRIMARY KEY (feed_import_id, trip_id),
  FOREIGN KEY (feed_import_id, route_id) REFERENCES routes (feed_import_id, route_id) ON DELETE CASCADE
);

CREATE INDEX trips_feed_route_idx ON trips (feed_import_id, route_id);
CREATE INDEX trips_feed_service_idx ON trips (feed_import_id, service_id);

CREATE TABLE stop_times (
  feed_import_id UUID NOT NULL,
  trip_id TEXT NOT NULL,
  arrival_time TEXT,
  departure_time TEXT,
  stop_id TEXT NOT NULL,
  stop_sequence INTEGER NOT NULL,
  stop_headsign TEXT,
  pickup_type TEXT,
  drop_off_type TEXT,
  continuous_pickup TEXT,
  continuous_drop_off TEXT,
  shape_dist_traveled TEXT,
  timepoint TEXT,
  PRIMARY KEY (feed_import_id, trip_id, stop_sequence),
  FOREIGN KEY (feed_import_id, trip_id) REFERENCES trips (feed_import_id, trip_id) ON DELETE CASCADE,
  FOREIGN KEY (feed_import_id, stop_id) REFERENCES stops (feed_import_id, stop_id) ON DELETE RESTRICT
);

CREATE INDEX stop_times_feed_stop_idx ON stop_times (feed_import_id, stop_id);
CREATE INDEX stop_times_feed_trip_sequence_idx ON stop_times (feed_import_id, trip_id, stop_sequence);

CREATE TABLE calendar (
  feed_import_id UUID NOT NULL REFERENCES feed_imports (feed_import_id) ON DELETE CASCADE,
  service_id TEXT NOT NULL,
  monday TEXT NOT NULL,
  tuesday TEXT NOT NULL,
  wednesday TEXT NOT NULL,
  thursday TEXT NOT NULL,
  friday TEXT NOT NULL,
  saturday TEXT NOT NULL,
  sunday TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  PRIMARY KEY (feed_import_id, service_id)
);

CREATE TABLE calendar_dates (
  feed_import_id UUID NOT NULL REFERENCES feed_imports (feed_import_id) ON DELETE CASCADE,
  service_id TEXT NOT NULL,
  date DATE NOT NULL,
  exception_type TEXT NOT NULL,
  PRIMARY KEY (feed_import_id, service_id, date)
);

CREATE INDEX calendar_dates_feed_service_idx ON calendar_dates (feed_import_id, service_id);
