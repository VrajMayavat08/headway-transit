import type { CSSProperties } from 'react'
import type { TtcSurfaceRoute } from '@/features/network/data/ttcSurfaceRoutes'
import type { TtcSurfaceRouteProfile } from '@/features/network/data/ttcSurfaceRouteProfiles'
import { getRouteDisplayColor } from '@/features/network/data/routeDisplayColors'

type RouteDetailsProps = { route: TtcSurfaceRoute | null; profile: TtcSurfaceRouteProfile | null }

function routeTypeName(routeType: number) {
  return routeType === 0 ? 'Streetcar' : 'Bus'
}

export function RouteDetails({ route, profile }: RouteDetailsProps) {
  if (!route || !profile) return null
  const accent = getRouteDisplayColor(route.routeId)

  return (
    <section className="route-details" style={{ '--route-accent': accent } as CSSProperties} aria-labelledby="route-details-title">
      <header className="route-details-header">
        <span>ROUTE</span>
        <h1 id="route-details-title">{route.routeShortName}</h1>
        <h2>{route.routeLongName}</h2>
        <small>SCHEDULED NETWORK</small>
      </header>
      <dl className="route-details-metadata">
        <div><dt>MODE</dt><dd>{routeTypeName(route.routeType)}</dd></div>
        {profile.headsign && <div><dt>HEADSIGN</dt><dd>{profile.headsign}</dd></div>}
        <div><dt>FIRST STOP</dt><dd>{profile.firstStop?.stopName ?? 'Unavailable'}</dd></div>
        <div><dt>LAST STOP</dt><dd>{profile.lastStop?.stopName ?? 'Unavailable'}</dd></div>
        <div><dt>STOPS</dt><dd>{profile.stopCount}</dd></div>
      </dl>
      <section className="route-stop-list" aria-labelledby="route-stop-list-title">
        <h3 id="route-stop-list-title">STOP SEQUENCE</h3>
        <ol>
          {profile.stopSequence.map((stop, index) => (
            <li key={`${stop.stopId}-${index}`}>
              <span aria-hidden="true" />
              <span>{stop.stopName}</span>
            </li>
          ))}
        </ol>
      </section>
    </section>
  )
}
