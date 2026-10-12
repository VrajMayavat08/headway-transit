# Architecture

Headway is an npm workspace. `apps/` contains runnable applications. The frontend uses React, TypeScript, Vite, TanStack Router, TanStack Query, lucide-react, and plain CSS. `apps/api` is a Fastify service for future application data.

## Web responsibilities

- `src/app/`: application entry, routing, and providers. Query is wired without data queries.
- `src/layouts/AppShell/`: shared wordmark, top navigation, side rail, and content outlet.
- `src/pages/`: route entry components that compose layouts and future features. Each currently contains a title, description, and empty workspace.
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

`apps/api` keeps Fastify route wiring separate from PostgreSQL access and SQL migrations. PostgreSQL with PostGIS runs locally through `compose.yaml`; it will persist static GTFS schedules, bounded-retention vehicle observations, trip updates, alerts, derived reliability metrics, and historical playback queries. Current migrations enable PostGIS, track migration history, and establish the static GTFS schedule schema.

For local development, copy `.env.example` to `.env`, then run `npm run db:up`, `npm run db:migrate`, and `npm run dev:api`. Stop the database with `npm run db:down`. The named Docker volume preserves local data across restarts.

## Static GTFS schedules

The static schedule schema stores feed imports, agencies, routes, stops, trips, stop times, shapes, service calendars, and calendar exceptions. Stops and shape points have PostGIS `Point` geometries in SRID 4326. GTFS arrival and departure values remain text so times beyond 24:00:00 are preserved.

Place the ignored local TTC archive at `data/imports/ttc-static-gtfs.zip`, then run `npm run import:ttc-gtfs --workspace @headway/api`. The importer replaces the prior TTC schedule snapshot in one transaction while retaining other agency feeds. It reports inserted row counts; database counts can be inspected with `SELECT count(*) FROM routes`, `stops`, `trips`, `stop_times`, and `shapes` after import.

Static schedules are distinct from future GTFS-Realtime observations. Vehicle telemetry will be retained with bounded local storage; it is not collected or stored by this importer.

## Repository boundaries

`packages/` is reserved for reusable libraries when sharing is needed. `docs/screenshots/` holds future visual references. `data/imports/` and `data/archive/` hold ignored local inputs and historical files; only directory placeholders are tracked.

`packages/` remains reserved for reusable libraries. A future `apps/collector` will ingest and archive transit feeds. Shared contracts may move into `packages/` when these applications require them. GTFS storage, collection, analytics, and playback behavior are not implemented yet.
