type RouteStop = {
  stopId: string
  stopName: string | null
  latitude: number
  longitude: number
}

type RouteStopPattern = {
  directionId: string | null
  stops: RouteStop[]
}

type RouteStops = {
  patterns: RouteStopPattern[]
}

type StopMarker = {
  longitude: number
  latitude: number
  stopIds: Set<string>
  stopNames: Set<string>
  directionIds: Set<string>
  isTerminal: boolean
}

export function buildRouteStopFeatureCollection(routeStops: RouteStops | undefined) {
  const markers = new Map<string, StopMarker>()

  for (const pattern of routeStops?.patterns ?? []) {
    const terminalStopIds = new Set([
      pattern.stops[0]?.stopId,
      pattern.stops.at(-1)?.stopId,
    ].filter((stopId): stopId is string => Boolean(stopId)))

    for (const stop of pattern.stops) {
      const validCoordinate = Number.isFinite(stop.longitude)
        && Number.isFinite(stop.latitude)
        && Math.abs(stop.longitude) <= 180
        && Math.abs(stop.latitude) <= 90
      if (!validCoordinate) continue

      // Shared platforms receive one marker while retaining every underlying GTFS identity.
      const coordinateKey = `${stop.longitude},${stop.latitude}`
      let marker = markers.get(coordinateKey)
      if (!marker) {
        marker = {
          longitude: stop.longitude,
          latitude: stop.latitude,
          stopIds: new Set(),
          stopNames: new Set(),
          directionIds: new Set(),
          isTerminal: false,
        }
        markers.set(coordinateKey, marker)
      }

      marker.stopIds.add(stop.stopId)
      marker.stopNames.add(stop.stopName ?? stop.stopId)
      marker.directionIds.add(pattern.directionId ?? 'unset')
      marker.isTerminal ||= terminalStopIds.has(stop.stopId)
    }
  }

  const features = [...markers.values()].map((marker) => {
    const stopIds = [...marker.stopIds].sort()
    const stopNames = [...marker.stopNames].sort()
    return {
      type: 'Feature' as const,
      properties: {
        stopId: stopIds[0],
        stopName: stopNames[0] ?? stopIds[0],
        stopIds: JSON.stringify(stopIds),
        stopNames: JSON.stringify(stopNames),
        directionIds: JSON.stringify([...marker.directionIds].sort()),
        isTerminal: marker.isTerminal,
      },
      geometry: { type: 'Point' as const, coordinates: [marker.longitude, marker.latitude] },
    }
  })

  return { type: 'FeatureCollection' as const, features }
}

export function createRouteStopLayerDefinitions() {
  return [
    {
      id: 'selected-ttc-route-intermediate-stop-halo',
      type: 'circle',
      source: 'selected-ttc-route-stops',
      filter: ['==', ['get', 'isTerminal'], false],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 5.3, 11, 6.4, 13, 7.7, 15, 9],
        'circle-color': '#0b1212',
        'circle-opacity': 0.88,
      },
    },
    {
      id: 'selected-ttc-route-terminal-stop-halo',
      type: 'circle',
      source: 'selected-ttc-route-stops',
      filter: ['==', ['get', 'isTerminal'], true],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 6.3, 11, 7.5, 13, 9, 15, 10.5],
        'circle-color': '#0b1212',
        'circle-opacity': 0.88,
      },
    },
    {
      id: 'selected-ttc-route-intermediate-stops',
      type: 'circle',
      source: 'selected-ttc-route-stops',
      filter: ['==', ['get', 'isTerminal'], false],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 3.1, 11, 3.8, 13, 4.6, 15, 5.5],
        'circle-color': '#f1eee5',
        'circle-opacity': 1,
        'circle-stroke-width': 1.4,
        'circle-stroke-color': '#0b1212',
      },
    },
    {
      id: 'selected-ttc-route-terminals',
      type: 'circle',
      source: 'selected-ttc-route-stops',
      filter: ['==', ['get', 'isTerminal'], true],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 4, 11, 4.9, 13, 6, 15, 7.2],
        'circle-color': '#f1eee5',
        'circle-opacity': 1,
        'circle-stroke-width': 1.7,
        'circle-stroke-color': '#0b1212',
      },
    },
    {
      id: 'selected-ttc-route-stop-hover',
      type: 'circle',
      source: 'selected-ttc-route-stops',
      filter: ['==', ['get', 'stopId'], ''],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 5.5, 11, 7, 13, 8.5, 15, 10],
        'circle-color': '#f1eee5',
        'circle-opacity': 0.15,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#f1eee5',
      },
    },
  ]
}
