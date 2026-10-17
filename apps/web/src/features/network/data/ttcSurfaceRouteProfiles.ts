import generatedProfiles from './generated/ttc-surface-route-profiles.json'

export type TtcSurfaceRouteProfile = {
  routeId: string
  routeShortName: string
  routeLongName: string
  routeType: number
  officialRouteColor: string | null
  representativeTripId: string
  headsign: string | null
  directionId: string | null
  stopCount: number
  shownPatternCount: number
  omittedPatternCount: number
  firstStop: TtcRouteSequenceStop | null
  lastStop: TtcRouteSequenceStop | null
  stopSequence: TtcRouteSequenceStop[]
}

export type TtcRouteSequenceStop = { stopId: string; stopName: string }

const ttcSurfaceRouteProfiles = generatedProfiles as TtcSurfaceRouteProfile[]

export function getTtcSurfaceRouteProfile(routeId: string | null) {
  return routeId ? ttcSurfaceRouteProfiles.find((profile) => profile.routeId === routeId) ?? null : null
}
