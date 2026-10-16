# TTC real-time data

## Verified sources

TTC publishes its BusTime GTFS-Realtime feeds through the City of Toronto Open Data catalogue:

- Vehicle positions: `https://bustime.ttc.ca/gtfsrt/vehicles`
- Trip updates: `https://bustime.ttc.ca/gtfsrt/trips`
- Service alerts: `https://bustime.ttc.ca/gtfsrt/alerts`

The feeds are binary Protocol Buffer GTFS-Realtime messages. TTC describes the BusTime vehicle and prediction feeds as close to real time, while the GTFS-Realtime service-disruptions catalogue covers surface, subway, planned, accessibility, and reduced-speed-zone alerts. No API key, authentication header, refresh interval, or rate limit is documented by TTC for these URLs. Consumers should use a conservative interval only after an ingestion service exists and must treat an absent entity as unavailable data, never as normal service.

The applicable licence is the Open Government Licence - Toronto. Attribution must read: `Contains information licensed under the Open Government Licence - Toronto`.

## Static-feed compatibility

The BusTime catalogue says its real-time feeds must be used with TTC's revised surface-only `SurfaceGTFS.zip`. Run the read-only comparison below before joining live identifiers to a static snapshot:

```powershell
npm run check:ttc-identifier-compatibility --workspace @headway/api -- --download-surface
```

The command stores the official source archive at the gitignored `data/imports/ttc-surface-gtfs.zip`, reads only `routes.txt`, `trips.txt`, and `stops.txt`, fetches one live vehicle-position snapshot, and reports distinct live route, trip, and stop identifier match rates against both SurfaceGTFS and the existing local static archive. It does not import data into PostgreSQL.

## Vehicle collection boundary

`apps/api/src/realtime/ttcVehiclePositions.ts` fetches and decodes one vehicle-position snapshot. The opt-in collector persists decoded observations transactionally and matches identifiers only against the separate `ttc-surface` snapshot. It preserves reported identifiers when no SurfaceGTFS match exists. `GET /api/realtime/vehicles` reads the latest stored snapshot; it never fetches TTC on request. See [the local integration procedure](local-integration.md) for the enablement steps.

## Service-alert boundary

`GET /api/alerts` reads the official TTC BusTime GTFS-Realtime alerts feed on demand with a 10-second request timeout and caches a successful decoded response in API memory for 30 seconds. An optional `routeId` query filters the normalized response by GTFS-Realtime `informed_entity.route_id`. Upstream failures return HTTP 503 and are never converted into an empty or all-clear result.

The response reports `available` when the complete feed contains alert entities and `empty` only when a successful complete feed contains none. It includes the feed timestamp, fetch timestamp, total unfiltered alert count, source attribution, and normalized alert entities. Alert entities preserve source header and description text, affected route and stop IDs, cause, effect, source-provided severity, active periods, and URL. Missing optional fields remain `null` or empty. The current TTC feed may omit active periods and severity; Headway does not infer either field.

## References

- [TTC BusTime Real-Time Next Vehicle Arrival](https://open.toronto.ca/dataset/ttc-bustime-real-time-next-vehicle-arrival-nvas/)
- [TTC GTFS-Realtime service disruptions](https://open.toronto.ca/dataset/ttc-gtfs-realtime-gtfs-rt/)
- [GTFS-Realtime reference](https://gtfs.org/documentation/realtime/reference/)
- [GTFS-Realtime vehicle positions](https://gtfs.org/documentation/realtime/feed-entities/vehicle-positions/)
