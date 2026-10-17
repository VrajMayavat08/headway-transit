import { Outlet, useRouterState } from '@tanstack/react-router'
import { TopNav } from './TopNav'
import { SideRail } from './SideRail'

export function AppShell() {
  const workspace = useRouterState({
    select: (state) => state.location.pathname === '/routes'
      ? 'routes'
      : state.location.pathname === '/stops'
        ? 'stops'
        : undefined,
  })

  return (
    <div className="app-shell" data-workspace={workspace}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <TopNav />
      <SideRail />
      <main id="main-content" tabIndex={-1}><Outlet /></main>
    </div>
  )
}
