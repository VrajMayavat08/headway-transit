import type { CSSProperties } from 'react'
import type { TtcSurfaceStop } from '@/features/network/data/ttcSurfaceStops'
import { getRouteDisplayColor } from '@/features/network/data/routeDisplayColors'
import { getTtcSurfaceRoute } from '@/features/network/data/ttcSurfaceRoutes'

type StopDetailsProps = { stop: TtcSurfaceStop | null; onRouteSelect: (routeId: string) => void }

export function StopDetails({ stop, onRouteSelect }: StopDetailsProps) {
  if (!stop) {
    return (
      <section className="stop-details stop-details-empty" aria-live="polite">
        <span>SELECT A STOP</span>
        <p>Choose an imported TTC stop to inspect its scheduled network context.</p>
      </section>
    )
  }

  return (
    <section className="stop-details" aria-labelledby="stop-details-title">
      <header className="stop-details-header">
        <span>STOP</span>
        <h1 id="stop-details-title">{stop.stopName}</h1>
        <small>SCHEDULED NETWORK</small>
      </header>
      <dl className="stop-details-metadata">
        <div><dt>GTFS STOP ID</dt><dd>{stop.stopId}</dd></div>
        <div><dt>LATITUDE</dt><dd>{stop.stopLat.toFixed(6)}</dd></div>
        <div><dt>LONGITUDE</dt><dd>{stop.stopLon.toFixed(6)}</dd></div>
      </dl>
      <section className="stop-serving-routes" aria-labelledby="serving-routes-title">
        <h2 id="serving-routes-title">SERVING ROUTES</h2>
        <div>
          {stop.routeIds.map((routeId) => {
            const route = getTtcSurfaceRoute(routeId)
            const color = getRouteDisplayColor(routeId)
            return (
              <button
                key={routeId}
                type="button"
                onClick={() => onRouteSelect(routeId)}
                style={{ '--route-accent': color } as CSSProperties}
                title={route ? `${route.routeShortName} ${route.routeLongName}` : routeId}
              >
                {route?.routeShortName ?? routeId}
              </button>
            )
          })}
        </div>
      </section>
    </section>
  )
}
