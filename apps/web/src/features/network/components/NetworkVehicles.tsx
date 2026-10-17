import { useEffect, useRef, useState } from 'react'
import type { ExpressionSpecification, GeoJSONSource, Map, MapLayerMouseEvent } from 'maplibre-gl'
import { useVehicles, type VehicleObservation } from '@/features/network/api/vehicles'
import { registerVehicleIconImages, vehicleIconImageId, vehicleIconKinds, vehicleIconRotation, type VehicleIconKind } from '@/features/network/lib/vehicleIcons'
import { vehicleIconKind, vehicleTypeLabel } from '@/features/network/lib/vehiclePresentation'
import { vehiclesForSelectedRoute } from '@/features/network/lib/vehicleVisibility'
import { formatLocalDateTime } from '@/lib/formatting/time'
import styles from './NetworkVehicles.module.css'

const sourceId = 'headway-live-vehicles'
export const vehicleHitLayer = 'headway-live-vehicle-hit'
const selectedIconLayer = 'headway-live-vehicle-selected'
const iconLayerPrefix = 'headway-live-vehicle-icon-'
const emptyVehicles: VehicleObservation[] = []

function vehicleKey(vehicle: VehicleObservation) {
  return vehicle.vehicleId ? `vehicle:${vehicle.vehicleId}` : `entity:${vehicle.entityId}`
}

function iconLayerId(kind: VehicleIconKind) {
  return `${iconLayerPrefix}${kind}`
}

const iconImageExpression: ExpressionSpecification = [
  'match', ['get', 'kind'],
  'bus', vehicleIconImageId('bus'),
  'streetcar', vehicleIconImageId('streetcar'),
  vehicleIconImageId('vehicle'),
]

function iconSize(routeId: string | null): ExpressionSpecification {
  if (!routeId) return ['interpolate', ['linear'], ['zoom'], 9, 0.44, 13, 0.7]
  const selectedRoute: ExpressionSpecification = ['==', ['get', 'routeId'], routeId]
  return ['interpolate', ['linear'], ['zoom'], 9, ['case', selectedRoute, 0.56, 0.3], 13, ['case', selectedRoute, 0.78, 0.48]]
}

function updateVehicles(map: Map, observations: VehicleObservation[], visible: boolean, routeId: string | null, entityId: string | null, updateData = true) {
  const source = map.getSource(sourceId) as GeoJSONSource | undefined
  if (!source) return
  if (updateData) source.setData({
    type: 'FeatureCollection',
    features: observations.map((vehicle) => ({
      type: 'Feature',
      properties: {
        entityId: vehicleKey(vehicle),
        routeId: vehicle.reportedRouteId ?? '',
        kind: vehicleIconKind(vehicle.matchedSurfaceRouteId),
        bearing: vehicleIconRotation(vehicle.bearing),
      },
      geometry: { type: 'Point', coordinates: [vehicle.longitude, vehicle.latitude] },
    })),
  })

  const shouldShowVehicles = visible && routeId !== null
  for (const layer of [selectedIconLayer, vehicleHitLayer]) {
    map.setLayoutProperty(layer, 'visibility', shouldShowVehicles ? 'visible' : 'none')
  }
  for (const kind of vehicleIconKinds) {
    const layer = iconLayerId(kind)
    if (map.getLayer(layer)) map.setLayoutProperty(layer, 'visibility', shouldShowVehicles ? 'visible' : 'none')
  }

  const selectedVehicle: ExpressionSpecification = ['==', ['get', 'entityId'], entityId ?? '']
  const visibleRouteFilter: ExpressionSpecification = ['==', ['get', 'routeId'], routeId ?? '__no-selected-route__']
  const routeOpacity: ExpressionSpecification = ['case', selectedVehicle, 1, 0.9]
  map.setFilter(selectedIconLayer, ['all', selectedVehicle, visibleRouteFilter])
  for (const kind of vehicleIconKinds) {
    const layer = iconLayerId(kind)
    if (!map.getLayer(layer)) continue
    map.setFilter(layer, ['all', ['==', ['get', 'kind'], kind], visibleRouteFilter])
    map.setLayoutProperty(layer, 'icon-size', iconSize(routeId))
    map.setPaintProperty(layer, 'icon-opacity', routeOpacity)
  }
  map.setFilter(vehicleHitLayer, visibleRouteFilter)
}

export function NetworkVehicles({ map, selectedRouteId }: { map: Map | null; selectedRouteId: string | null }) {
  const query = useVehicles()
  const [visible, setVisible] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const observations = query.data?.observations ?? emptyVehicles
  const matchingVehicles = vehiclesForSelectedRoute(observations, selectedRouteId)
  const selected = matchingVehicles.find((vehicle) => vehicleKey(vehicle) === selectedId)
  const current = useRef({ observations, visible, selectedRouteId, selectedId })

  useEffect(() => {
    const updateData = current.current.observations !== observations
    current.current = { observations, visible, selectedRouteId, selectedId }
    if (map?.getSource(sourceId)) updateVehicles(map, observations, visible, selectedRouteId, selectedId, updateData)
  }, [map, observations, visible, selectedRouteId, selectedId])

  useEffect(() => {
    setSelectedId(null)
  }, [selectedRouteId])

  useEffect(() => {
    if (!map) return
    let disposed = false
    let handlersBound = false
    const click = (event: MapLayerMouseEvent) => {
      const id = event.features?.[0]?.properties?.entityId
      if (typeof id === 'string') setSelectedId(id)
    }
    const enter = () => { map.getCanvas().style.cursor = 'pointer' }
    const leave = () => { map.getCanvas().style.cursor = '' }
    const initialize = () => {
      if (disposed) return
      registerVehicleIconImages(map)
      if (!map.getSource(sourceId)) map.addSource(sourceId, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      for (const kind of vehicleIconKinds) {
        const layerId = iconLayerId(kind)
        if (map.getLayer(layerId)) continue
        map.addLayer({
          id: layerId, source: sourceId, type: 'symbol', filter: ['==', ['get', 'kind'], kind],
          layout: {
            'icon-image': vehicleIconImageId(kind),
            'icon-size': iconSize(null),
            'icon-rotate': ['get', 'bearing'],
            'icon-rotation-alignment': 'map',
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
          },
          paint: { 'icon-opacity': 0.52 },
        })
      }
      if (!map.getLayer(selectedIconLayer)) map.addLayer({
        id: selectedIconLayer,
        source: sourceId,
        type: 'symbol',
        filter: ['==', ['get', 'entityId'], '__no-selected-vehicle__'],
        layout: {
          'icon-image': iconImageExpression,
          'icon-size': ['interpolate', ['linear'], ['zoom'], 9, 0.78, 13, 1.02],
          'icon-rotate': ['get', 'bearing'],
          'icon-rotation-alignment': 'map',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
        paint: { 'icon-opacity': 1 },
      })
      if (!map.getLayer(vehicleHitLayer)) map.addLayer({ id: vehicleHitLayer, source: sourceId, type: 'circle', paint: { 'circle-radius': 10, 'circle-opacity': 0 } })
      const state = current.current
      updateVehicles(map, state.observations, state.visible, state.selectedRouteId, state.selectedId)
      if (!handlersBound) {
        map.on('click', vehicleHitLayer, click)
        map.on('mouseenter', vehicleHitLayer, enter)
        map.on('mouseleave', vehicleHitLayer, leave)
        handlersBound = true
      }
    }
    if (map.isStyleLoaded()) initialize()
    map.on('style.load', initialize)
    return () => {
      disposed = true
      map.off('style.load', initialize)
      if (handlersBound) {
        map.off('click', vehicleHitLayer, click)
        map.off('mouseenter', vehicleHitLayer, enter)
        map.off('mouseleave', vehicleHitLayer, leave)
      }
      for (const layer of [vehicleHitLayer, selectedIconLayer, ...vehicleIconKinds.map(iconLayerId)]) if (map.getLayer(layer)) map.removeLayer(layer)
      if (map.getSource(sourceId)) map.removeSource(sourceId)
    }
  }, [map])

  const status = !selectedRouteId ? 'Select a route to view live vehicles.'
    : query.isError ? 'Request error · data may be stale'
      : query.isPending ? 'Loading observations'
        : query.data?.status === 'empty' ? 'No observations collected'
          : matchingVehicles.length === 0 ? `No live vehicles reported for route ${selectedRouteId}.`
            : query.data?.status === 'stale' ? 'Stale observations' : 'Current observations'
  const selectedKind = selected ? vehicleIconKind(selected.matchedSurfaceRouteId) : null

  return <div className={styles.overlay}>
    <div className={styles.status}>
      <label><input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} />Live vehicles</label>
      <span role="status">{status}</span>
      <span>Last collected (local): {formatLocalDateTime(query.data?.snapshot?.fetchedAt)}</span>
      {query.data?.snapshot && <span>Feed updated (local): {formatLocalDateTime(query.data.snapshot.feedTimestamp)}</span>}
      {selectedRouteId && query.data && <span>{matchingVehicles.length.toLocaleString()} vehicles on route {selectedRouteId}</span>}
    </div>
    {visible && selected && selectedKind && <aside className={styles.details} aria-label="Selected vehicle">
      <button type="button" onClick={() => setSelectedId(null)} aria-label="Close vehicle details">×</button>
      <strong>VEHICLE {selected.vehicleId ?? 'ID unavailable'}</strong>
      <span>{vehicleTypeLabel(selectedKind)}</span>
      <span>Reported route: {selected.reportedRouteId ?? 'Unavailable'}</span>
      <span>Observed (local): {formatLocalDateTime(selected.sourceTimestamp)}</span>
      {selected.matchedSurfaceTripId && <span>Confirmed SurfaceGTFS trip: {selected.matchedSurfaceTripId}</span>}
    </aside>}
  </div>
}
