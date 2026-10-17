import assert from 'node:assert/strict'
import test from 'node:test'
import { buildRouteStopFeatureCollection, createRouteStopLayerDefinitions } from '../src/features/routes/lib/routeStopMapData.ts'

test('route-35-sized patterns retain every valid stop identity and expose all marker categories', () => {
  const southbound = Array.from({ length: 43 }, (_, index) => ({
    stopId: index === 0 ? 'north-terminal' : index === 42 ? 'south-terminal' : `south-${index}`,
    stopName: `Southbound stop ${index + 1}`,
    latitude: 43.777 - index * 0.002,
    longitude: -79.51 + index * 0.0002,
  }))
  const northbound = Array.from({ length: 43 }, (_, index) => ({
    stopId: index === 0 ? 'south-terminal' : index === 42 ? 'north-terminal' : `north-${index}`,
    stopName: `Northbound stop ${index + 1}`,
    latitude: index === 0 ? southbound[42]!.latitude : index === 42 ? southbound[0]!.latitude : 43.693 + index * 0.002,
    longitude: index === 0 ? southbound[42]!.longitude : index === 42 ? southbound[0]!.longitude : -79.501 - index * 0.0002,
  }))

  const collection = buildRouteStopFeatureCollection({
    patterns: [
      { directionId: '0', stops: southbound },
      { directionId: '1', stops: northbound },
    ],
  })

  assert.equal(southbound.length + northbound.length, 86)
  assert.equal(collection.features.length, 84)
  assert.equal(collection.features.filter((feature) => feature.properties.isTerminal).length, 2)
  assert.equal(collection.features.filter((feature) => !feature.properties.isTerminal).length, 82)

  const representedStopIds = new Set(collection.features.flatMap((feature) => JSON.parse(feature.properties.stopIds) as string[]))
  assert.equal(representedStopIds.size, 84)
  assert.ok(representedStopIds.has('south-21'))
  assert.ok(representedStopIds.has('north-21'))
})

test('intermediate and terminal layers are explicit, visible at overview zoom, and ordered above route geometry', () => {
  const layers = createRouteStopLayerDefinitions()
  const intermediateHalo = layers.find((layer) => layer.id === 'selected-ttc-route-intermediate-stop-halo')
  const terminalHalo = layers.find((layer) => layer.id === 'selected-ttc-route-terminal-stop-halo')
  const intermediate = layers.find((layer) => layer.id === 'selected-ttc-route-intermediate-stops')
  const terminals = layers.find((layer) => layer.id === 'selected-ttc-route-terminals')

  assert.deepEqual(intermediateHalo?.filter, ['==', ['get', 'isTerminal'], false])
  assert.deepEqual(terminalHalo?.filter, ['==', ['get', 'isTerminal'], true])
  assert.deepEqual(intermediate?.filter, ['==', ['get', 'isTerminal'], false])
  assert.deepEqual(terminals?.filter, ['==', ['get', 'isTerminal'], true])
  assert.equal(intermediate?.source, 'selected-ttc-route-stops')
  assert.equal(terminals?.source, 'selected-ttc-route-stops')
  assert.equal('minzoom' in (intermediate ?? {}), false)
  assert.equal(intermediate?.paint['circle-opacity'], 1)
  assert.ok(layers.findIndex((layer) => layer.id === 'selected-ttc-route-intermediate-stops') < layers.findIndex((layer) => layer.id === 'selected-ttc-route-terminals'))
})

test('every paint expression contains at most one zoom-driven interpolation', () => {
  function zoomInterpolationCount(value: unknown): number {
    if (!Array.isArray(value)) return 0
    const isZoomInterpolation = value[0] === 'interpolate'
      && Array.isArray(value[2])
      && value[2][0] === 'zoom'
    return (isZoomInterpolation ? 1 : 0) + value.reduce<number>((total, child) => total + zoomInterpolationCount(child), 0)
  }

  for (const layer of createRouteStopLayerDefinitions()) {
    for (const [property, expression] of Object.entries(layer.paint)) {
      assert.ok(
        zoomInterpolationCount(expression) <= 1,
        `${layer.id}.${property} contains multiple zoom-driven interpolations`,
      )
    }
  }
})
