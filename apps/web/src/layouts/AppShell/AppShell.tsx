import { Outlet } from '@tanstack/react-router'
import { TopNav } from './TopNav'
import { SideRail } from './SideRail'

export function AppShell() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <TopNav />
      <SideRail />
      <main id="main-content" tabIndex={-1}><Outlet /></main>
    </div>
  )
}
