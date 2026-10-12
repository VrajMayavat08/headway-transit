const metrics = [
  'On-time performance',
  'Average observed headway',
  'Bunching incidents',
  'Service gaps',
]

export function ReliabilityOverview() {
  return (
    <section className="reliability-section reliability-overview" aria-labelledby="reliability-overview-title">
      <header><span>OVERVIEW</span><h2 id="reliability-overview-title">Observed service performance</h2></header>
      <div className="reliability-metric-positions">
        {metrics.map((metric) => <div key={metric}><span>{metric}</span><strong>Awaiting observations</strong></div>)}
      </div>
      <p>Reliability metrics become available after Headway collects vehicle observations.</p>
    </section>
  )
}
