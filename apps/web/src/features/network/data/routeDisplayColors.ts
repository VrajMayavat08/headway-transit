const displayColorsByRouteId: Record<string, string> = {
  '29': '#4f7fd7',
  '35': '#7868d8',
  '52': '#e9c64a',
  '54': '#e68a43',
  '63': '#35aeb0',
  '75': '#56a96f',
  '97': '#e55358',
  '501': '#df6845',
  '504': '#d99d3f',
}

export function getRouteDisplayColor(routeId: string) {
  return displayColorsByRouteId[routeId] ?? '#899692'
}

export const routeDisplayColorExpression = ['match', ['get', 'routeId'], ...Object.entries(displayColorsByRouteId).flatMap(([routeId, color]) => [routeId, color]), '#899692'] as const
