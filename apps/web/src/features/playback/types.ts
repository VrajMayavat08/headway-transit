export type PlaybackAvailability = 'available' | 'unavailable' | 'partial'

export interface PlaybackEventMarker {
  id: string
  timestamp: string
  type: 'bunching' | 'service-gap' | 'delay'
}

export interface PlaybackSession {
  sessionId: string
  agencyId: string
  startTimestamp: string
  endTimestamp: string
  routeIds: string[]
  observationCoverage: number | null
  eventMarkers: PlaybackEventMarker[]
  availability: PlaybackAvailability
}
