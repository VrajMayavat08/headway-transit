import { Link } from '@tanstack/react-router'
import { navigation } from './navigation'

export function TopNav() {
  return (
    <header className="top-bar">
      <Link to="/network" className="wordmark">HEADWAY</Link>
      <nav className="top-nav" aria-label="Primary navigation">
        {navigation.map(({ to, label }) => <Link key={to} to={to} activeOptions={{ exact: true }}>{label}</Link>)}
      </nav>
    </header>
  )
}
