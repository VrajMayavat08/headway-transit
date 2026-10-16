import { useObservedHeadways } from '@/features/reliability/api/headways'

export function HeadwayAnalysis({ routeId }: { routeId: string }) {
  const query = useObservedHeadways(routeId)
  const data = query.data
  return <section className="reliability-section headway-analysis" aria-labelledby="headway-analysis-title">
    <header><span>HEADWAY ANALYSIS</span><h2 id="headway-analysis-title">Detected passage intervals</h2></header>
    <p>Detection pilot · latest 60 minutes, independent of the page range. Bounds reflect sampling uncertainty, not exact crossing times or arrivals. Only one SurfaceGTFS shape per route and direction is examined.</p>
    {query.isPending && <p role="status">Checking stored observations…</p>}
    {query.isError && <p role="alert">Analysis unavailable. {data ? 'The previous result may be stale.' : 'Unable to read stored observations.'}</p>}
    {data && <>
      <p>{new Date(data.window.start).toLocaleTimeString()} – {new Date(data.window.end).toLocaleTimeString()} · {data.coverage.snapshotCount} snapshots · {data.coverage.sampleCount.toLocaleString()} samples</p>
      {data.coverage.firstCollectedAt && <p>Collection coverage begins {new Date(data.coverage.firstCollectedAt).toLocaleTimeString()} · {data.coverage.gapCount} gaps over 120 seconds.</p>}
      <p>Last collected: {data.coverage.lastCollectedAt ? new Date(data.coverage.lastCollectedAt).toLocaleString() : 'No observations'}.</p>
      {data.status === 'insufficient_data' && <p role="status"><strong>Insufficient data.</strong> At least two unambiguous headway intervals at the same point, direction, and shape are required.</p>}
      {data.coverage.capped && <p>The bounded analysis limit was reached; no partial metrics are shown.</p>}
      {data.results.length > 0 && <div className="reliability-table-wrap"><table>
        <thead><tr><th>Route / direction</th><th>Shape</th><th>Passages / intervals</th><th>Mean interval bounds</th></tr></thead>
        <tbody>{data.results.map((result) => <tr key={`${result.routeId}:${result.directionId}:${result.shapeId}`}>
          <th scope="row">{result.routeId} / {result.directionId}</th>
          <td>{result.shapeId}</td>
          <td>{result.passageCount} / {result.headwayCount}</td>
          <td>{result.meanHeadwayBoundsSeconds
            ? `${(Math.floor(result.meanHeadwayBoundsSeconds.minimum / 6) / 10).toFixed(1)}–${(Math.ceil(result.meanHeadwayBoundsSeconds.maximum / 6) / 10).toFixed(1)} min`
            : 'Insufficient data'}</td>
        </tr>)}</tbody>
      </table></div>}
      {data.unavailableRoutes.length > 0 && <p>No unambiguous observation point for routes: {data.unavailableRoutes.join(', ')}.</p>}
      <p>Intervals are between detected vehicles on the same geometric branch. Missed vehicles can inflate intervals; these are not route-wide reliability scores. Overlapping passage brackets, stale samples, direction conflicts, and large gaps are excluded.</p>
    </>}
  </section>
}
