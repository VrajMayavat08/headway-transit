export function RoutesPage() {
  return (
    <section className="page" aria-labelledby="page-title">
      <header>
        <h1 id="page-title">Routes</h1>
        <p>A workspace for exploring transit routes.</p>
      </header>
      <div className="workspace" role="region" aria-label="Routes workspace" />
    </section>
  )
}
