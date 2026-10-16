# Detected passage headway bounds, version 1

`GET /api/reliability/headways` analyzes the latest 60 minutes of persisted TTC vehicle observations for the nine featured routes. Optional `?routeId=29` restricts the analysis to one featured route. Unsupported route IDs return 400; database failures return a safe 503. No ingestion or external feed request runs in the handler.

## What is measured

This is a conservative GPS passage-detection pilot. It reports **time bounds between detected passages**, never exact arrival times, interpolated crossing times, scheduled headways, headway adherence, or a reliability score. A vehicle changing sides of a fixed gate is evidence of a crossing between its two source timestamps, conditional on the GPS and GTFS shape being correct. It is not a direct observation of the instant of crossing.

For each route and GTFS direction, choose the shape with the most scheduled trips in the current `ttc-surface` snapshot (ties resolve by shape ID). Place one fixed gate halfway along that ordered shape's geographic length. Gates on shapes shorter than 1.2 km or near another section of a looping/self-crossing shape are excluded. These points are geometry-derived and are not stop arrivals. Stops and `current_stop_sequence` do not establish arrival events because no arrival/departure or stop-status history is stored.

Every sample must have a physical vehicle ID, source timestamp, valid coordinates, a trip verified against `ttc-surface`, a matching reported/verified route, and a verified trip direction and shape. A supplied direction conflicting with that trip is rejected; an unknown supplied direction may use the verified trip direction. Observations collected before the current SurfaceGTFS import completed are not joined to that new snapshot. There is no fallback to `ttc-static`.

## Passage and headway rules

1. Order each vehicle's observations by collection time. Reset tracking when its trip, shape, direction or data quality is incompatible.
2. Project positions onto the ordered shape within 40 m. Reject ambiguous projections onto distant sections of the same shape. Only samples within 300 m of the fixed gate qualify.
3. Reject samples more than 120 seconds old at collection, more than 5 seconds in the future, missing timestamps, reversed source time, sample gaps over 120 seconds, backward movement over 15 m, and jumps exceeding 35 m/s in geographic or along-shape distance. These are quality guards, not service performance targets.
4. Deduplicate the same vehicle/source timestamp; conflicting positions at that timestamp break continuity. Detect at most one passage per physical vehicle/trip/gate. A before-gate position must be at least 10 m before the gate, followed within 120 seconds by a position at least 10 m beyond it, on the same trip and shape. Retain the two timestamps as `[earliest, latest]`; do not interpolate an exact crossing time.
5. Consider adjacent detected passages only at the same gate, direction, and shape. Exclude overlapping brackets, their ambiguous neighbors, successive visits by the same vehicle, and intervals spanning a collector outage over 120 seconds. Never bridge over an ambiguous passage to calculate a replacement interval.
6. For passage A before B, headway bounds are `[B.earliest − A.latest, B.latest − A.earliest]` seconds. Average the lower and upper bounds separately only when there are at least two valid headway intervals. Otherwise return `insufficient_data` and a null mean.

The response includes the analysis window, actual collection coverage, sample/usable sample counts, rejection diagnostics, passage brackets, interval bounds, and supporting shape/point IDs and coordinates. Counts are per gate; do not sum repeated route-level sample/rejection counts across directions.

## Limitations and operating bounds

- 60-second polling creates crossing-time uncertainty and misses some passages. GPS error, diversions, incorrect upstream trip descriptors, and gaps in individual vehicle reporting remain possible. Mean bounds apply to detected passages; missed vehicles can inflate them. They do not certify the true consecutive-vehicle headway or describe all route service.
- Shape ID separates geometric branches. Different service variants sharing identical geometry remain one geometric corridor, not a stop-service pattern. Other shapes are excluded even on shared streets. Results must not be aggregated into a route-wide reliability conclusion.
- Sparse direction/branch samples correctly produce insufficient data. Two intervals permit descriptive bounds only, not a performance judgment.
- Before this change, the decoder read protobuf's default direction `0` even when the field was absent. It now preserves absence as null. Historical conflicts remain rejected; stored rows are not rewritten.
- Queries use a repeatable-read, read-only transaction, the existing source/time snapshot index, and existing snapshot/trip/shape indexes. The hard cap is 61 snapshots and 120,000 route observations, with a 10-second timeout per statement. If the cap is exceeded, no partial metric is calculated.
- Analysis runs on demand. The frontend caches it for 60 seconds and does not continuously recalculate or poll it. The pilot window is always the latest hour, explicitly independent of the page's future historical range controls.

The next validation step is to compare these brackets with a short, independently timestamped observation at the same gates, then assess missed-vehicle coverage and GPS tolerance before presenting these as operational reliability measures.
