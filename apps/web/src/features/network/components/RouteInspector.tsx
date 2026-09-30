import type { CSSProperties } from 'react'
import { getRouteDisplayColor } from '@/features/network/data/routeDisplayColors'
import type { TtcSurfaceRoute } from '@/features/network/data/ttcSurfaceRoutes'
import { getTtcSurfaceRouteProfile } from '@/features/network/data/ttcSurfaceRouteProfiles'

type RouteInspectorProps = {
  route: TtcSurfaceRoute | null
  selectedStopId: string | null
}

export function RouteInspector({ route, selectedStopId }: RouteInspectorProps) {
  if (!route) {
    return (
      <div className="route-inspector-empty">
        <span>SELECT A ROUTE</span>
        <p>Choose a route on the network to inspect it.</p>
      </div>
    )
  }

  const profile = getTtcSurfaceRouteProfile(route.routeId)
  if (!profile) return null
  const accent = { '--route-accent': getRouteDisplayColor(route.routeId) } as CSSProperties
  const routeType = profile.routeType === 0 ? 'Streetcar' : 'Bus'

  return (
    <div className="route-inspector-content" style={accent}>
      <header className="route-inspector-header">
        <span className="route-inspector-label">ROUTE</span>
        <strong>{profile.routeShortName}</strong>
        <h2>{profile.routeLongName}</h2>
        <span className="route-inspector-status">SCHEDULED NETWORK</span>
      </header>

      <dl className="route-inspector-details">
        <div><dt>STOPS</dt><dd>{profile.stopCount}</dd></div>
        <div><dt>TYPE</dt><dd>{routeType}</dd></div>
        <div><dt>FROM</dt><dd>{profile.firstStop?.stopName}</dd></div>
        <div><dt>TO</dt><dd>{profile.lastStop?.stopName}</dd></div>
        {profile.headsign && <div><dt>HEADSIGN</dt><dd>{profile.headsign}</dd></div>}
      </dl>

      <ol className="route-stop-sequence" aria-label="Representative trip stop sequence">
        {profile.stopSequence.map((stop) => (
          <li key={`${stop.stopId}-${stop.stopName}`} className={stop.stopId === selectedStopId ? 'is-selected' : undefined}>
            <span aria-hidden="true" />
            <span>{stop.stopName}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
