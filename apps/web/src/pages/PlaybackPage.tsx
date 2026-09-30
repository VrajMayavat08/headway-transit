export function PlaybackPage() {
  return (
    <section className="page" aria-labelledby="page-title">
      <header>
        <h1 id="page-title">Playback</h1>
        <p>A workspace for reviewing historical transit activity.</p>
      </header>
      <div className="workspace" role="region" aria-label="Playback workspace" />
    </section>
  )
}
