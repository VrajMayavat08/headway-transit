import { Outlet, useRouterState } from '@tanstack/react-router'
import { TopNav } from './TopNav'
import { SideRail } from './SideRail'

export function AppShell() {
  const isRoutesWorkspace = useRouterState({ select: (state) => state.location.pathname === '/routes' })

  return (
    <div className="app-shell" data-workspace={isRoutesWorkspace ? 'routes' : undefined}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <TopNav />
      <SideRail />
      <main id="main-content" tabIndex={-1}><Outlet /></main>
    </div>
  )
}
