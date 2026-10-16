# Historical vehicle snapshots

`GET /api/playback/vehicles?timestamp=2026-10-16T13:56:26.784Z&routeId=29`

`timestamp` is required: an ISO date-time with timezone. `routeId` is optional (1–64 letters, digits, underscores, periods, colons, or hyphens). Route filtering uses `reported_route_id`, without inferring static trip matches.

## Snapshot selection

The endpoint selects the nearest **collection timestamp** within ±90 seconds of the requested time. An exact tie chooses the earlier collection, then snapshot ID. Coordinates and source timestamps are returned unchanged; there is no interpolation or historical reconstruction.

The permitted interval is `[server now − configured vehicle retention, server now]`. The endpoint reads the existing `TTC_VEHICLE_RETENTION_HOURS` configuration; it does not change retention or collector behavior. Requests before that boundary return `outside_retention`, even if cleanup has not yet physically removed older rows. Requests within retention without a snapshot in tolerance, and requests in the future, return `no_data`. A selected snapshot can legitimately contain zero vehicles for a route.

All three data outcomes return HTTP 200. Invalid query parameters return 400. Database failures return 503 with `{ "status": "unavailable" }`.

## Response fields

- `status`: `available`, `no_data`, or `outside_retention`.
- `requestedAt`, `routeId`, `toleranceSeconds`: selection context.
- `retention`: permitted start/end timestamps, independent of actual collection coverage.
- `window`: first/last timestamps in the supplied timeline, or null endpoints when none exist.
- `timeline`: ascending collection timestamps only, no vehicle history payloads.
- `snapshot`: actual snapshot ID, `fetchedAt`, upstream `feedTimestamp` (epoch seconds), and unfiltered snapshot vehicle count; null when unavailable.
- `observations`: entity/vehicle identifiers, reported route/trip IDs, source timestamp (epoch seconds), latitude, and longitude for the selected snapshot only.
- `timelineTruncated`, `observationsTruncated`: explicit response-limit flags.

Collection time is not a stop-arrival time. Each vehicle's source timestamp can precede the snapshot collection time. A historical snapshot is evidence of discrete reported positions, not continuously observed movement or a confirmed trip match.

## Query and frontend bounds

Metadata is limited to the latest 2,000 retained snapshot timestamps. Vehicle responses are limited to 3,000 observations, sorted by entity ID. Limits do not silently claim complete coverage: truncation flags are shown in the session panel. The configured six-hour window at roughly one snapshot per minute fits comfortably within the metadata cap.

Nearest-snapshot selection uses two bounded index walks (one before and one after the requested time) on the existing source/collection-time index. Observation reads use the snapshot index. Queries run within a repeatable-read, read-only transaction with a five-second per-statement timeout so concurrent retention cleanup cannot split one response across inconsistent snapshots. No migration or ingestion change is required.

Playback reuses the existing map and one GeoJSON circle source, updating it in place when selection changes. The scrubber covers actual collected timestamps and supports arbitrary times in gaps; previous/next buttons select real adjacent collections. A date-time input permits explicit historical requests. Manual snapshot review is enabled; automatic play and speed controls remain disabled.

Timeline requests are debounced by 180 ms, consume TanStack Query's abort signal, and clear old vehicle positions during a new selection. Superseded requests cannot populate a different timestamp's query key. Unobserved queries are garbage-collected after five seconds to bound scrub-cache memory. The page does not poll for new history or fetch an entire day's vehicle history. Reopen/refresh the page to refresh the available window, or request a new time.
