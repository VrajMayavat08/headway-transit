// These are sampling/geometry quality limits, not TTC performance targets.
export const passageLimits = { maxGapSeconds: 120, maxSampleAgeSeconds: 120, maxSpeedMetersPerSecond: 35, corridorMeters: 40, gateMarginMeters: 10, gateRadiusMeters: 300 }

export type Shape = { routeId: string; directionId: string; shapeId: string; coordinates: [number, number][] }
export type Observation = {
  vehicleId: string | null
  timestamp: number | null
  fetchedAt: string
  routeId: string | null
  tripId: string | null
  directionId: number | null
  matchedRouteId: string | null
  tripRouteId: string | null
  tripDirectionId: string | null
  shapeId: string | null
  latitude: number
  longitude: number
}
type XY = [number, number]
export type ObservationPoint = Shape & { longitude: number; latitude: number; progress: number; path: XY[]; distances: number[] }
export type Passage = { vehicleId: string; tripId: string; earliest: number; latest: number }
export type HeadwayBounds = { minimumSeconds: number; maximumSeconds: number }

function distance(a: XY, b: XY) { return Math.hypot(a[0] - b[0], a[1] - b[1]) }
function xy(longitude: number, latitude: number, origin: [number, number]): XY {
  return [(longitude - origin[0]) * 111_195 * Math.cos(origin[1] * Math.PI / 180), (latitude - origin[1]) * 111_195]
}

export function createObservationPoint(shape: Shape): ObservationPoint | null {
  if (shape.coordinates.length < 2 || shape.coordinates.some(([lon, lat]) => !Number.isFinite(lon) || !Number.isFinite(lat) || Math.abs(lon) > 180 || Math.abs(lat) > 90)) return null
  const path = shape.coordinates.map(([lon, lat]) => xy(lon, lat, shape.coordinates[0]))
  const distances = [0]
  for (let index = 1; index < path.length; index += 1) distances.push(distances[index - 1] + distance(path[index - 1], path[index]))
  const length = distances[distances.length - 1]
  if (length < 1_200) return null // Keep the gate clear of termini.
  const progress = length / 2
  const index = distances.findIndex((value) => value >= progress)
  const fraction = (progress - distances[index - 1]) / (distances[index] - distances[index - 1])
  const a = shape.coordinates[index - 1]
  const b = shape.coordinates[index]
  const point = { ...shape, path, distances, progress, longitude: a[0] + (b[0] - a[0]) * fraction, latitude: a[1] + (b[1] - a[1]) * fraction }
  // Reject gates near a different part of a looping/self-crossing shape.
  return project(point, point.longitude, point.latitude) === null ? null : point
}

function project(point: ObservationPoint, longitude: number, latitude: number): number | null {
  const position = xy(longitude, latitude, point.coordinates[0])
  const candidates: { distance: number; progress: number }[] = []
  for (let index = 1; index < point.path.length; index += 1) {
    const a = point.path[index - 1]
    const b = point.path[index]
    const length = distance(a, b)
    if (!length) continue
    const fraction = Math.max(0, Math.min(1, ((position[0] - a[0]) * (b[0] - a[0]) + (position[1] - a[1]) * (b[1] - a[1])) / length ** 2))
    const gap = distance(position, [a[0] + fraction * (b[0] - a[0]), a[1] + fraction * (b[1] - a[1])])
    if (gap <= passageLimits.corridorMeters) candidates.push({ distance: gap, progress: point.distances[index - 1] + fraction * length })
  }
  candidates.sort((a, b) => a.distance - b.distance)
  const nearest = candidates[0]
  if (!nearest || candidates.some((candidate) => Math.abs(candidate.progress - nearest.progress) > 150)) return null
  return nearest.progress
}

export function calculateHeadwayBounds(passages: Passage[], coverageGaps: [number, number][] = []): HeadwayBounds[] {
  const ordered = [...passages].sort((a, b) => a.earliest - b.earliest)
  const ambiguous = ordered.map((passage, index) =>
    (index > 0 && ordered.slice(0, index).some((previous) => previous.latest >= passage.earliest))
    || (index + 1 < ordered.length && ordered[index + 1].earliest <= passage.latest))
  const bounds: HeadwayBounds[] = []
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1]
    const next = ordered[index]
    if (ambiguous[index - 1] || ambiguous[index] || previous.vehicleId === next.vehicleId) continue
    if (coverageGaps.some(([start, end]) => start < next.latest && end > previous.earliest)) continue
    bounds.push({ minimumSeconds: next.earliest - previous.latest, maximumSeconds: next.latest - previous.earliest })
  }
  return bounds
}

export function analyzePassages(point: ObservationPoint, observations: Observation[], coverageGaps: [number, number][] = []) {
  const rejected = { missingIdentityOrTime: 0, unverifiedTrip: 0, directionConflict: 0, staleSample: 0, invalidPosition: 0, duplicate: 0, conflictingDuplicate: 0, gapOrJump: 0, offCorridorOrAmbiguous: 0 }
  const passages: Passage[] = []
  const tracks = new Map<string, Observation[]>()
  const relevant = observations.filter((sample) => sample.routeId === point.routeId)
  for (const sample of relevant) {
    if (!sample.vehicleId) { rejected.missingIdentityOrTime += 1; continue }
    const track = tracks.get(sample.vehicleId) ?? []
    track.push(sample)
    tracks.set(sample.vehicleId, track)
  }
  let usableSamples = 0
  for (const [vehicleId, track] of tracks) {
    // Collection order ensures missing timestamps and conflicting IDs break continuity.
    track.sort((a, b) => Date.parse(a.fetchedAt) - Date.parse(b.fetchedAt))
    const signatures = new Map<number, Set<string>>()
    for (const sample of track) {
      if (sample.timestamp === null) continue
      const values = signatures.get(sample.timestamp) ?? new Set<string>()
      values.add(JSON.stringify([sample.tripId, sample.shapeId, sample.tripDirectionId, sample.directionId, sample.latitude, sample.longitude]))
      signatures.set(sample.timestamp, values)
    }
    let previous: { time: number; progress: number; tripId: string; position: XY } | null = null
    let before: { time: number; tripId: string } | null = null
    const seen = new Map<number, string>()
    const completed = new Set<string>()
    for (const sample of track) {
      const reset = () => { previous = null; before = null }
      if (sample.timestamp === null || !Number.isFinite(sample.timestamp) || sample.timestamp <= 0) { rejected.missingIdentityOrTime += 1; reset(); continue }
      // Precheck the entire track: a later conflicting duplicate invalidates its earlier copy too.
      if ((signatures.get(sample.timestamp)?.size ?? 0) > 1) { rejected.conflictingDuplicate += 1; reset(); continue }
      if (!sample.tripId || sample.tripRouteId !== point.routeId || sample.matchedRouteId !== point.routeId || !sample.shapeId || !['0', '1'].includes(sample.tripDirectionId ?? '')) { rejected.unverifiedTrip += 1; reset(); continue }
      if (sample.directionId !== null && String(sample.directionId) !== sample.tripDirectionId) { rejected.directionConflict += 1; reset(); continue }
      if (sample.shapeId !== point.shapeId || sample.tripDirectionId !== point.directionId) { reset(); continue }
      const age = Date.parse(sample.fetchedAt) / 1000 - sample.timestamp
      if (!Number.isFinite(age) || age < -5 || age > passageLimits.maxSampleAgeSeconds) { rejected.staleSample += 1; reset(); continue }
      if (!Number.isFinite(sample.latitude) || !Number.isFinite(sample.longitude) || Math.abs(sample.latitude) > 90 || Math.abs(sample.longitude) > 180) { rejected.invalidPosition += 1; reset(); continue }
      const signature = JSON.stringify([sample.tripId, sample.latitude, sample.longitude])
      if (seen.has(sample.timestamp)) {
        if (seen.get(sample.timestamp) === signature) rejected.duplicate += 1
        else { rejected.conflictingDuplicate += 1; reset() }
        continue
      }
      seen.set(sample.timestamp, signature)
      const progress = project(point, sample.longitude, sample.latitude)
      if (progress === null || Math.abs(progress - point.progress) > passageLimits.gateRadiusMeters) { rejected.offCorridorOrAmbiguous += 1; reset(); continue }
      const position = xy(sample.longitude, sample.latitude, point.coordinates[0])
      usableSamples += 1
      if (previous) {
        const elapsed = sample.timestamp - previous.time
        if (previous.tripId !== sample.tripId || elapsed <= 0 || elapsed > passageLimits.maxGapSeconds
          || distance(position, previous.position) / elapsed > passageLimits.maxSpeedMetersPerSecond
          || (progress - previous.progress) / elapsed > passageLimits.maxSpeedMetersPerSecond || progress < previous.progress - 15) {
          rejected.gapOrJump += 1; reset()
        }
      }
      if (progress < point.progress - passageLimits.gateMarginMeters) before = { time: sample.timestamp, tripId: sample.tripId }
      if (progress > point.progress + passageLimits.gateMarginMeters && before && before.tripId === sample.tripId
        && sample.timestamp - before.time <= passageLimits.maxGapSeconds && !completed.has(sample.tripId)
        && !coverageGaps.some(([start, end]) => start < sample.timestamp! && end > before!.time)) {
        passages.push({ vehicleId, tripId: sample.tripId, earliest: before.time, latest: sample.timestamp })
        completed.add(sample.tripId)
        before = null
      }
      previous = { time: sample.timestamp, progress, tripId: sample.tripId, position }
    }
  }
  const headways = calculateHeadwayBounds(passages, coverageGaps)
  const sufficient = headways.length >= 2
  return {
    routeId: point.routeId, directionId: point.directionId, shapeId: point.shapeId,
    point: { latitude: point.latitude, longitude: point.longitude, basis: 'shape-distance-midpoint' as const },
    status: sufficient ? 'available' as const : 'insufficient_data' as const,
    sampleCount: relevant.length, usableSamples, passageCount: passages.length, headwayCount: headways.length,
    meanHeadwayBoundsSeconds: sufficient ? {
      minimum: headways.reduce((sum, value) => sum + value.minimumSeconds, 0) / headways.length,
      maximum: headways.reduce((sum, value) => sum + value.maximumSeconds, 0) / headways.length,
    } : null,
    passages, headways, rejected,
  }
}
