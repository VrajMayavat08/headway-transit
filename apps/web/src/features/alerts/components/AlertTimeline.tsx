export function AlertTimeline() {
  return <section className="alert-timeline" aria-labelledby="alert-timeline-title">
    <header><span>ALERT TIMELINE</span><h1 id="alert-timeline-title">Service disruption activity</h1></header>
    <div className="alert-timeline-empty"><span aria-hidden="true" /><div><strong>NO ALERT DATA</strong><p>Service alerts will appear here when the TTC realtime alerts feed is connected.</p></div></div>
  </section>
}
