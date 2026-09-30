export function NetworkPage() {
  return (
    <section className="page" aria-labelledby="page-title">
      <header>
        <h1 id="page-title">Network</h1>
        <p>A workspace for observing the transit network.</p>
      </header>
      <div className="workspace" role="region" aria-label="Network workspace" />
    </section>
  )
}
