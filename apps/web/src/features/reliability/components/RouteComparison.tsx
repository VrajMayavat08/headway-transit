import type { CSSProperties } from 'react'
import type { TtcSurfaceRoute } from '@/features/network/data/ttcSurfaceRoutes'
import { getRouteDisplayColor } from '@/features/network/data/routeDisplayColors'

export function RouteComparison({ routes }: { routes: TtcSurfaceRoute[] }) {
  return (
    <section className="reliability-section route-comparison" aria-labelledby="route-comparison-title">
      <header><span>ROUTE COMPARISON</span><h2 id="route-comparison-title">Imported TTC routes</h2></header>
      <div className="reliability-table-wrap">
        <table>
          <thead><tr><th>Route</th><th>On-time</th><th>Headway adherence</th><th>Bunching</th><th>Service gaps</th></tr></thead>
          <tbody>{routes.map((route) => (
            <tr key={route.routeId}>
              <th scope="row"><span style={{ '--route-accent': getRouteDisplayColor(route.routeId) } as CSSProperties}>{route.routeShortName}</span>{route.routeLongName}</th>
              <td>Awaiting observations</td><td>Awaiting observations</td><td>Awaiting observations</td><td>Awaiting observations</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  )
}
