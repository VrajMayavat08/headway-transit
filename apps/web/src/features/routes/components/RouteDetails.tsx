import type { CSSProperties } from 'react'
import { getRouteDisplayColor } from '@/features/network/data/routeDisplayColors'
import type { ScheduleRoute, ScheduleRouteStops } from '@/features/routes/api/routes'

type RouteDetailsProps = {
  route: ScheduleRoute | null
  routeStops: ScheduleRouteStops | undefined
  isStopsLoading: boolean
  isStopsError: boolean
}

function routeTypeName(routeType: string) {
  const routeTypes: Record<string, string> = {
    '0': 'Streetcar',
    '1': 'Subway',
    '2': 'Rail',
    '3': 'Bus',
  }

  return routeTypes[routeType] ?? `GTFS type ${routeType}`
}

export function RouteDetails({ route, routeStops, isStopsLoading, isStopsError }: RouteDetailsProps) {
  if (!route) {
    return <section className="route-details route-details-empty" aria-label="Route details">Select a route to inspect its schedule metadata.</section>
  }
  const accent = getRouteDisplayColor(route.routeId)

  return (
    <section className="route-details" style={{ '--route-accent': accent } as CSSProperties} aria-labelledby="route-details-title">
      <header className="route-details-header">
        <span>ROUTE</span>
        <h1 id="route-details-title">{route.shortName ?? route.routeId}</h1>
        <h2>{route.longName ?? 'UNNAMED ROUTE'}</h2>
        <small>SCHEDULED NETWORK</small>
      </header>
      <dl className="route-details-metadata">
        <div><dt>MODE</dt><dd>{routeTypeName(route.routeType)}</dd></div>
      </dl>
      {isStopsLoading ? <p className="route-details-unavailable">Loading scheduled stop patterns.</p>
        : isStopsError ? <p className="route-details-unavailable">Scheduled stop patterns are unavailable.</p>
          : routeStops && routeStops.patterns.length > 0 ? (
        <section className="route-stop-list" aria-labelledby="route-stop-list-title">
          <h3 id="route-stop-list-title">REPRESENTATIVE STOP PATTERNS</h3>
          <div className="route-stop-patterns">
            {routeStops.patterns.map((pattern) => (
              <section className="route-stop-pattern" key={`${pattern.directionId ?? 'unset'}-${pattern.tripId}`}>
                <p>
                  <strong>{pattern.directionId === null ? 'DIRECTION UNSET' : `DIRECTION ${pattern.directionId}`}</strong>
                  <span>{pattern.headsign ?? 'No headsign'}</span>
                  <small>TRIP {pattern.tripId} · {pattern.tripCount} matching trips</small>
                </p>
                <ol>
                  {pattern.stops.map((stop) => (
                    <li key={`${stop.stopId}-${stop.sequence}`}>
                      <span aria-hidden="true" />
                      <span>{stop.stopName ?? stop.stopId}</span>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </section>
      ) : <p className="route-details-unavailable">No scheduled stop patterns are available for this route.</p>}
    </section>
  )
}
