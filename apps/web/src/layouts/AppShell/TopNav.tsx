import { Link, useRouterState } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { navigation } from './navigation'

export function TopNav() {
  const isNetwork = useRouterState({ select: (state) => state.location.pathname === '/network' })

  return (
    <header className="top-bar">
      <Link to="/network" className="wordmark">HEADWAY</Link>
      <nav className="top-nav" aria-label="Primary navigation">
        {navigation.map(({ to, label }) => <Link key={to} to={to} activeOptions={{ exact: true }}>{label}</Link>)}
      </nav>
      {isNetwork && (
        <div className="network-top-chrome">
          <div className="network-top-status" aria-label="Operational status">
            <time dateTime="08:42:17">08:42:17</time>
            <span><i aria-hidden="true" />LIVE</span>
          </div>
          <div className="network-top-search" role="search" aria-label="Network search">
            <Search size={15} strokeWidth={1.5} aria-hidden="true" />
            <span>Search routes, stops, or vehicles…</span>
            <kbd>⌘ K</kbd>
          </div>
        </div>
      )}
    </header>
  )
}
