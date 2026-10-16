# Architecture

Headway is an npm workspace. `apps/` contains runnable applications. The frontend uses React, TypeScript, Vite, TanStack Router, TanStack Query, lucide-react, and plain CSS. `apps/api` is a Fastify service for future application data.

## Web responsibilities

- `src/app/`: application entry, routing, and providers. Query is wired without data queries.
- `src/layouts/AppShell/`: shared wordmark, top navigation, side rail, and content outlet.
- `src/pages/`: route entry components that compose the Network, Routes, Stops, Reliability, Playback, and Alerts workspaces.
- `src/features/`: page-specific functionality, organized by network, routes, stops, reliability, playback, and alerts; reserved only.
- `src/components/ui/`: generic reusable UI.
- `src/components/transit/`: Headway-specific visual primitives.
- `src/domain/transit/`: transit domain types and models.
- `src/mocks/`: future development fixtures.
- `src/lib/geo/` and `src/lib/formatting/`: future focused utilities.
- `src/styles/`: visual tokens, typography, and global layout rules.
- `public/`: static assets.

The `@/` alias resolves to `apps/web/src/` in both TypeScript and Vite. Reserved directories have no exports until implemented. Routing uses an explicit code-based route tree; `/` redirects to `/network`.

## API and database responsibilities

`apps/api` keeps Fastify route wiring separate from PostgreSQL access and SQL migrations. PostgreSQL with PostGIS runs locally through `compose.yaml`; it persists static GTFS schedules and bounded-retention vehicle observations. The API exposes read-only schedule routes, representative stops, representative geometry, latest vehicle observations, bounded historical snapshots, observed-headway bounds, and TTC service alerts. Current migrations enable PostGIS, track migration history, establish the static GTFS schedule schema, and create TTC vehicle observation storage.

For local development, copy `.env.example` to `.env`, then run `npm run db:up`, `npm run db:migrate`, and `npm run dev:api`. Stop the database with `npm run db:down`. The named Docker volume preserves local data across restarts. `CORS_ORIGINS` defaults to the local Vite origins; deployments must configure it for the actual frontend origin. See [the local integration procedure](local-integration.md) for the full API, collector, and frontend verification sequence.

## Static GTFS schedules

The static schedule schema stores feed imports, agencies, routes, stops, trips, stop times, shapes, service calendars, and calendar exceptions. Stops and shape points have PostGIS `Point` geometries in SRID 4326. GTFS arrival and departure values remain text so times beyond 24:00:00 are preserved.

Place the ignored local TTC archive at `data/imports/ttc-static-gtfs.zip`, then run `npm run import:ttc-gtfs --workspace @headway/api`. The importer replaces the prior TTC schedule snapshot in one transaction while retaining other agency feeds. It reports inserted row counts; database counts can be inspected with `SELECT count(*) FROM routes`, `stops`, `trips`, `stop_times`, and `shapes` after import.

For TTC BusTime vehicle matching, download `SurfaceGTFS.zip` yourself to the ignored `data/imports/ttc-surface-gtfs.zip`, then run `npm run import:ttc-surface-gtfs --workspace @headway/api`. This creates or replaces only the separate `ttc-surface` snapshot; existing schedule endpoints continue to read `ttc-static`.

Static schedules are distinct from future GTFS-Realtime observations. Vehicle telemetry will be retained with bounded local storage; it is not collected or stored by this importer.

## TTC vehicle observations

Migration `003_realtime_vehicle_observations.sql` adds timestamped TTC vehicle snapshots and observations. The collector is disabled by default. After importing the separate `ttc-surface` snapshot, set `TTC_VEHICLE_COLLECTOR_ENABLED=true` to enable it locally. `TTC_VEHICLE_POLL_INTERVAL_SECONDS` defaults to 60 and cannot be lower than 30; `TTC_VEHICLE_STALE_AFTER_SECONDS` defaults to 180. `TTC_VEHICLE_RETENTION_HOURS` defaults to 6 and bounds local snapshot history. A failed fetch leaves the last stored snapshot intact. `GET /api/realtime/vehicles` returns `empty`, `current`, or `stale` according to the latest stored snapshot.

## Schedule API

`GET /api/routes` returns the routes from the currently imported TTC static feed, naturally ordered by route short name. It returns an empty array when no TTC routes have been imported. Each entry has this shape:

```json
{
  "routeId": "29",
  "shortName": "29",
  "longName": "Dufferin",
  "routeType": "3",
  "color": "ED1C24"
}
```

## Repository boundaries

`packages/` is reserved for reusable libraries when sharing is needed. `docs/screenshots/` holds future visual references. `data/imports/` and `data/archive/` hold ignored local inputs and historical files; only directory placeholders are tracked.

`packages/` remains reserved for reusable libraries. A future `apps/collector` may separate transit ingestion from the API process. Shared contracts may move into `packages/` when these applications require them. Current headway analysis reports bounded detected-passage intervals, and playback presents discrete recorded snapshots; neither produces route-wide reliability scores or interpolated vehicle movement.
