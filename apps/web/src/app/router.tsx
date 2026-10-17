import { createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router'
import { AppShell } from '@/layouts/AppShell/AppShell'
import { NetworkPage } from '@/pages/NetworkPage'
import { RoutesPage } from '@/pages/RoutesPage'
import { StopsPage } from '@/pages/StopsPage'
import { ReliabilityPage } from '@/pages/ReliabilityPage'
import { PlaybackPage } from '@/pages/PlaybackPage'
import { AlertsPage } from '@/pages/AlertsPage'

const rootRoute = createRootRoute({ component: AppShell })
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => { throw redirect({ to: '/network', search: { routeId: undefined }, replace: true }) },
})
const networkRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/network',
  validateSearch: (search: Record<string, unknown>) => ({
    routeId: typeof search.routeId === 'string' ? search.routeId : undefined,
  }),
  component: NetworkPage,
})
const routesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/routes',
  validateSearch: (search: Record<string, unknown>) => ({
    routeId: typeof search.routeId === 'string' ? search.routeId : undefined,
  }),
  component: RoutesPage,
})
const stopsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/stops', component: StopsPage })
const reliabilityRoute = createRoute({ getParentRoute: () => rootRoute, path: '/reliability', component: ReliabilityPage })
const playbackRoute = createRoute({ getParentRoute: () => rootRoute, path: '/playback', component: PlaybackPage })
const alertsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/alerts', component: AlertsPage })

export const router = createRouter({
  routeTree: rootRoute.addChildren([indexRoute, networkRoute, routesRoute, stopsRoute, reliabilityRoute, playbackRoute, alertsRoute]),
})

declare module '@tanstack/react-router' {
  interface Register { router: typeof router }
}
