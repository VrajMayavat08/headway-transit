export type SearchableRoute = {
  routeId: string
  shortName: string | null
  longName: string | null
}

export function filterNetworkRoutes(routes: SearchableRoute[], query: string, supportedRouteIds: ReadonlySet<string>) {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  return routes.filter((route) => {
    if (!supportedRouteIds.has(route.routeId)) return false
    if (!normalizedQuery) return true
    return route.routeId.toLocaleLowerCase().includes(normalizedQuery)
      || (route.shortName ?? '').toLocaleLowerCase().includes(normalizedQuery)
      || (route.longName ?? '').toLocaleLowerCase().includes(normalizedQuery)
  })
}

export function nextNetworkSearchIndex(currentIndex: number, resultCount: number, key: 'ArrowDown' | 'ArrowUp') {
  if (resultCount === 0) return -1
  if (key === 'ArrowDown') return currentIndex < resultCount - 1 ? currentIndex + 1 : 0
  return currentIndex > 0 ? currentIndex - 1 : resultCount - 1
}
