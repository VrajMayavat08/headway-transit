import { Link } from '@tanstack/react-router'
import { navigation } from './navigation'

export function SideRail() {
  return (
    <nav className="side-rail" aria-label="Workspace navigation">
      {navigation.map(({ to, label, icon: Icon }) => (
        <Link key={to} to={to} aria-label={label} title={label} activeOptions={{ exact: true }}>
          <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
        </Link>
      ))}
    </nav>
  )
}
