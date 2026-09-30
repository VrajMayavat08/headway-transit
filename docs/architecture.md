# Architecture

Headway is an npm workspace. `apps/` contains runnable applications; only `apps/web` exists in this pass. The frontend uses React, TypeScript, Vite, TanStack Router, TanStack Query, lucide-react, and plain CSS.

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

## Repository boundaries

`packages/` is reserved for reusable libraries when sharing is needed. `docs/screenshots/` holds future visual references. `data/imports/` and `data/archive/` hold ignored local inputs and historical files; only directory placeholders are tracked.

Future `apps/api` will serve application data, and `apps/collector` will ingest and archive transit feeds. Neither application nor any backend package is created yet. Shared contracts may move into `packages/` when these applications require them. No GTFS processing, storage, authentication, analytics, or playback behavior exists in this skeleton.
