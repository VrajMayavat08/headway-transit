# Local integration procedure

Run these commands from the repository root in Windows PowerShell. They do not reset the database or reimport the full `ttc-static` schedule snapshot.

## 1. Configure and start PostgreSQL

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm.cmd run db:up
npm.cmd run db:migrate
```

## 2. Import SurfaceGTFS when it is not already present

Place the manually downloaded TTC `SurfaceGTFS.zip` at `data/imports/ttc-surface-gtfs.zip`, then run:

```powershell
npm.cmd run import:ttc-surface-gtfs --workspace @headway/api
```

This creates or replaces only the `ttc-surface` snapshot used for live vehicle identifier matching. It does not replace `ttc-static`.

## 3. Start the API and collector

Open a new PowerShell window in the repository root:

```powershell
$env:TTC_VEHICLE_COLLECTOR_ENABLED = 'true'
npm.cmd run dev:api
```

The collector polls once at startup and then every 60 seconds by default. Use the values in `.env` to adjust the interval, staleness threshold, and retention window. Stop the API with `Ctrl+C`; it waits for any active collection write before closing.

## 4. Start the frontend

Open another PowerShell window in the repository root:

```powershell
npm.cmd run dev
```

Vite proxies `/api` to `http://127.0.0.1:3001` unless `HEADWAY_API_URL` is set. This proxy is development-only: production builds call same-origin `/api` by default. When the API is on a separate origin, set `VITE_API_BASE_URL` to that absolute API origin at build time (for example, `https://api.example.com`, without `/api`) and include the frontend origin in the API's `CORS_ORIGINS`.

## Deployment configuration

The defaults bind the API and database to loopback addresses for local development. A deployed API must set `HOST` for its runtime network, configure `CORS_ORIGINS` with the comma-separated, absolute frontend origins, set a production `DATABASE_URL`, and keep `TTC_VEHICLE_COLLECTOR_ENABLED` explicit. Run migrations as a separate release step before starting the API. Do not expose PostgreSQL directly; the provided Compose configuration binds it only to `127.0.0.1`.

Run exactly one API process with `TTC_VEHICLE_COLLECTOR_ENABLED=true`. Run all other API instances with it set to `false`; the collector's in-process overlap guard only applies within one process and cannot coordinate multiple deployments.

## 5. Check schedule and realtime API responses

```powershell
Invoke-RestMethod http://127.0.0.1:3001/health/db
Invoke-RestMethod http://127.0.0.1:3001/api/routes
Invoke-RestMethod http://127.0.0.1:3001/api/routes/29/stops
Invoke-RestMethod http://127.0.0.1:3001/api/routes/29/geometry
Invoke-RestMethod http://127.0.0.1:3001/api/realtime/vehicles
```

The realtime endpoint returns `empty` before the first stored snapshot, `current` while the newest snapshot is within the configured staleness threshold, and `stale` afterward. Failed TTC fetches leave the previous stored snapshot unchanged.
