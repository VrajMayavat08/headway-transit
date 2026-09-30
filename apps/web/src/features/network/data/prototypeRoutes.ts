export type PrototypeRoute = {
  id: string
  color: string
  coordinates: [longitude: number, latitude: number][]
}

export const prototypeRoutes: PrototypeRoute[] = [
  {
    id: 'yonge',
    color: '#ef4b4e',
    coordinates: [[-79.381, 43.621], [-79.381, 43.642], [-79.382, 43.659], [-79.397, 43.671], [-79.405, 43.687], [-79.405, 43.705], [-79.405, 43.728], [-79.405, 43.756], [-79.405, 43.783]],
  },
  {
    id: 'bloor-danforth',
    color: '#f3c543',
    coordinates: [[-79.509, 43.636], [-79.484, 43.644], [-79.459, 43.649], [-79.431, 43.651], [-79.405, 43.652], [-79.382, 43.659], [-79.357, 43.666], [-79.332, 43.676], [-79.302, 43.681], [-79.268, 43.686]],
  },
  {
    id: 'eglinton',
    color: '#48ad70',
    coordinates: [[-79.502, 43.704], [-79.475, 43.704], [-79.448, 43.705], [-79.421, 43.705], [-79.393, 43.704], [-79.365, 43.703], [-79.337, 43.701], [-79.308, 43.698], [-79.274, 43.696]],
  },
  {
    id: 'scarborough',
    color: '#ef8a42',
    coordinates: [[-79.381, 43.621], [-79.357, 43.635], [-79.333, 43.650], [-79.310, 43.664], [-79.290, 43.680], [-79.274, 43.699], [-79.258, 43.721]],
  },
  {
    id: 'lakeshore',
    color: '#4d7cdb',
    coordinates: [[-79.529, 43.612], [-79.500, 43.615], [-79.470, 43.618], [-79.441, 43.620], [-79.412, 43.620], [-79.381, 43.621], [-79.353, 43.619], [-79.323, 43.617]],
  },
  {
    id: 'don-mills',
    color: '#28afad',
    coordinates: [[-79.381, 43.621], [-79.369, 43.642], [-79.357, 43.663], [-79.345, 43.685], [-79.336, 43.708], [-79.326, 43.733], [-79.318, 43.758]],
  },
]

export const prototypeRouteCollection = {
  type: 'FeatureCollection' as const,
  features: prototypeRoutes.map(({ id, color, coordinates }) => ({
    type: 'Feature' as const,
    properties: { id, color },
    geometry: { type: 'LineString' as const, coordinates },
  })),
}
