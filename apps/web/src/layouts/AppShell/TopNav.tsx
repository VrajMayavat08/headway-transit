import { Link, useRouterState } from '@tanstack/react-router'
import { NetworkRouteSearch } from '@/features/network/components/NetworkRouteSearch'
import { navigation } from './navigation'

export function TopNav() {
  const isNetwork = useRouterState({ select: (state) => state.location.pathname === '/network' })

  return (
    <header className="top-bar">
      <Link to="/network" search={{ routeId: undefined }} className="wordmark">HEADWAY</Link>
      <nav className="top-nav" aria-label="Primary navigation">
        {navigation.map(({ to, label }) => <Link key={to} to={to} activeOptions={{ exact: true }}>{label}</Link>)}
      </nav>
      {isNetwork && (
        <div className="network-top-chrome">
          <div className="network-top-status" aria-label="Operational status">
            <time dateTime="08:42:17">08:42:17</time>
            <span><i aria-hidden="true" />LIVE</span>
          </div>
          <NetworkRouteSearch />
        </div>
      )}
    </header>
  )
}
