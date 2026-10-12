export function HeadwayAnalysis() {
  return (
    <section className="reliability-section headway-analysis" aria-labelledby="headway-analysis-title">
      <header><span>HEADWAY ANALYSIS</span><h2 id="headway-analysis-title">Scheduled and observed service intervals</h2></header>
      <div className="analysis-chart-empty">
        <div aria-hidden="true" />
        <p>Observed headway analysis becomes available after telemetry collection. Scheduled and observed intervals will be compared here.</p>
      </div>
    </section>
  )
}

export function ServiceEvents() {
  return (
    <section className="reliability-section service-events" aria-labelledby="service-events-title">
      <header><span>SERVICE EVENTS</span><h2 id="service-events-title">Exceptions requiring review</h2></header>
      <div className="service-events-empty"><span aria-hidden="true" /><p>No events are available until service observations are collected.</p></div>
    </section>
  )
}
