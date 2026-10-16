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

Vite proxies `/api` to `http://127.0.0.1:3001` unless `HEADWAY_API_URL` is set.

## 5. Check schedule and realtime API responses

```powershell
Invoke-RestMethod http://127.0.0.1:3001/health/db
Invoke-RestMethod http://127.0.0.1:3001/api/routes
Invoke-RestMethod http://127.0.0.1:3001/api/routes/29/stops
Invoke-RestMethod http://127.0.0.1:3001/api/routes/29/geometry
Invoke-RestMethod http://127.0.0.1:3001/api/realtime/vehicles
```

The realtime endpoint returns `empty` before the first stored snapshot, `current` while the newest snapshot is within the configured staleness threshold, and `stale` afterward. Failed TTC fetches leave the previous stored snapshot unchanged.
