import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

type RouteFeature = {
  geometry: { type: string }
  properties: {
    routeId: string
    patternId: string
    shapeId: string
    representativeTripId: string
    directionId: string | null
    isPrimary: boolean
  }
}

type PatternStopFeature = {
  properties: { routeId: string; stopId: string; patternIds: string[] }
}

function artifact<T>(name: string): T {
  return JSON.parse(readFileSync(new URL(`../src/features/network/data/generated/${name}`, import.meta.url), 'utf8')) as T
}

const routes = artifact<{ features: RouteFeature[] }>('ttc-surface-routes.json')
const patternStops = artifact<{ features: PatternStopFeature[] }>('ttc-surface-pattern-stops.json')

for (const routeId of ['52', '29', '501']) {
  test(`Network ${routeId} stops reference only displayed GTFS shape patterns`, () => {
    const patterns = routes.features.filter((feature) => feature.geometry.type === 'LineString' && feature.properties.routeId === routeId)
    const displayedPatternIds = new Set(patterns.map((feature) => feature.properties.patternId))
    const shapeIds = patterns.map((feature) => feature.properties.shapeId)
    const stops = patternStops.features.filter((feature) => feature.properties.routeId === routeId)

    assert.ok(patterns.length > 1, `${routeId} should retain secondary GTFS patterns`)
    assert.equal(new Set(shapeIds).size, shapeIds.length, `${routeId} should not render duplicate shape geometry`)
    assert.equal(patterns.filter((feature) => feature.properties.isPrimary).length, 1)
    assert.ok(patterns.every((feature) => feature.properties.representativeTripId && feature.properties.directionId !== undefined))
    assert.ok(stops.length > 0)
    assert.ok(stops.every((stop) => stop.properties.patternIds.length > 0
      && stop.properties.patternIds.every((patternId) => displayedPatternIds.has(patternId))))
  })
}
