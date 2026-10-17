import { useObservedHeadways } from '@/features/reliability/api/headways'
import { getTtcSurfaceRoute } from '@/features/network/data/ttcSurfaceRoutes'
import { getTtcSurfaceRouteProfile } from '@/features/network/data/ttcSurfaceRouteProfiles'
import { formatLocalDateTime, formatLocalTime } from '@/lib/formatting/time'

function formatMinutes(seconds: { minimum: number; maximum: number }) {
  return `${(seconds.minimum / 60).toFixed(1)}-${(seconds.maximum / 60).toFixed(1)} min`
}

function directionLabel(routeId: string, directionId: string) {
  const profile = getTtcSurfaceRouteProfile(routeId)
  if (profile?.directionId === directionId && profile.headsign) return profile.headsign
  return `GTFS direction ${directionId}`
}

export function HeadwayAnalysis({ routeId }: { routeId: string }) {
  const query = useObservedHeadways(routeId)
  const data = query.data
  return <section className="reliability-section headway-analysis" aria-labelledby="headway-analysis-title">
    <header><span>IMPLEMENTED METRIC</span><h2 id="headway-analysis-title">Observed passage headways</h2></header>
    <p className="headway-intro">Latest 60-minute observation window. Bounds reflect sampling uncertainty, not exact crossing times or arrivals. Each result evaluates one verified SurfaceGTFS route, direction, and shape.</p>
    {query.isPending && <p className="headway-state" role="status">Checking stored observations…</p>}
    {query.isError && <p className="headway-state" role="alert">Analysis unavailable. {data ? 'The previous result may be stale.' : 'Unable to read stored observations.'}</p>}
    {data && <>
      <div className="headway-coverage">
        <span>{formatLocalTime(data.window.start)}-{formatLocalTime(data.window.end)} local</span>
        <span>{data.coverage.snapshotCount} snapshots</span><span>{data.coverage.sampleCount.toLocaleString()} samples</span>
        <span>Last collection {data.coverage.lastCollectedAt ? formatLocalDateTime(data.coverage.lastCollectedAt) : 'unavailable'}</span>
      </div>
      {data.status === 'insufficient_data' && <p className="headway-state" role="status"><strong>Insufficient data.</strong> At least two unambiguous intervals at one observation point, direction, and shape are required.</p>}
      {data.coverage.capped && <p className="headway-state">Analysis limit reached. Partial metrics are withheld.</p>}
      {data.results.length > 0 && <div className="reliability-table-wrap headway-table-wrap"><table>
        <thead><tr><th>Route</th><th>Scheduled direction</th><th>Mean observed headway</th><th>Valid passages / intervals</th><th>Technical basis</th></tr></thead>
        <tbody>{data.results.map((result) => <tr key={`${result.routeId}:${result.directionId}:${result.shapeId}`}>
          <th scope="row"><span>{getTtcSurfaceRoute(result.routeId)?.routeShortName ?? result.routeId}</span><small>{getTtcSurfaceRoute(result.routeId)?.routeLongName ?? 'TTC route'}</small></th>
          <td><strong>{directionLabel(result.routeId, result.directionId)}</strong>{directionLabel(result.routeId, result.directionId).startsWith('GTFS direction') && <small>Static headsign unavailable for this direction</small>}</td>
          <td className="headway-value">{result.meanHeadwayBoundsSeconds ? formatMinutes(result.meanHeadwayBoundsSeconds) : 'Insufficient data'}</td>
          <td>{result.passageCount} passages <span className="table-separator">/</span> {result.headwayCount} intervals</td>
          <td><details><summary>Shape basis</summary><code>{result.shapeId}</code></details></td>
        </tr>)}</tbody>
      </table></div>}
      {data.unavailableRoutes.length > 0 && <p>No unambiguous observation point for routes: {data.unavailableRoutes.join(', ')}.</p>}
      <p className="headway-method-note">Intervals are between detected vehicles on the same geometric branch. Missed vehicles can inflate intervals; these are not route-wide reliability scores. Overlapping passage brackets, stale samples, direction conflicts, and large gaps are excluded.</p>
    </>}
  </section>
}
