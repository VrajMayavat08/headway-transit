# Deployment preparation

Headway does not select a hosting provider. Build and operate the static frontend, Fastify API, and PostgreSQL/PostGIS database as separate deployment concerns.

## Required environment

Set these values in the deployment environment; do not commit them in an `.env` file.

| Variable | Required value |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string for the production PostGIS database. |
| `HOST` | Network interface supplied by the runtime, commonly `0.0.0.0`. |
| `PORT` | Runtime-assigned API port. |
| `CORS_ORIGINS` | Comma-separated absolute frontend origins, such as `https://headway.example.com`. |
| `TTC_VEHICLE_COLLECTOR_ENABLED` | `true` for exactly one API process; `false` for every other process. |
| `TTC_VEHICLE_POLL_INTERVAL_SECONDS` | Optional; at least `30`. Defaults to `60`. |
| `TTC_VEHICLE_STALE_AFTER_SECONDS` | Optional; at least the polling interval. Defaults to `180`. |
| `TTC_VEHICLE_RETENTION_HOURS` | Optional; defaults to `6` for bounded local observation retention. |
| `VITE_API_BASE_URL` | Frontend build-time value only when the API is on a different origin. Use its absolute origin without `/api`. |

Leave `VITE_API_BASE_URL` unset when a reverse proxy exposes frontend and API from one origin. The production frontend then calls relative `/api` paths. A separate-origin API requires both `VITE_API_BASE_URL` in the frontend build and the frontend origin in `CORS_ORIGINS`.

## Release procedure

From the repository root, after providing the deployment environment variables:

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd run db:migrate
npm.cmd run start:api
```

Serve `apps/web/dist` as static files and configure the static host to fall back to `index.html` for client routes. The build output is provider-neutral; do not use Vite's development proxy or `vite preview` as the production web server.

Run migrations once per release before API instances start. Start one collector-enabled API instance only after the `ttc-surface` GTFS snapshot exists. Additional API instances must set `TTC_VEHICLE_COLLECTOR_ENABLED=false`.

PostgreSQL should remain private to the API/database network. The repository Compose file is intended for local development and binds PostgreSQL to loopback only.
