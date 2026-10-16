import { useEffect, useRef, useState } from 'react'
import type { ExpressionSpecification, GeoJSONSource, Map, MapLayerMouseEvent } from 'maplibre-gl'
import { useVehicles, type VehicleObservation } from '@/features/network/api/vehicles'
import { getRouteDisplayColor } from '@/features/network/data/routeDisplayColors'
import styles from './NetworkVehicles.module.css'

const sourceId = 'headway-live-vehicles'
export const vehicleHitLayer = 'headway-live-vehicle-hit'
const circleLayer = 'headway-live-vehicle-nodes'
const emptyVehicles: VehicleObservation[] = []

function vehicleKey(vehicle: VehicleObservation) {
  return vehicle.vehicleId ? `vehicle:${vehicle.vehicleId}` : `entity:${vehicle.entityId}`
}

function updateVehicles(map: Map, observations: VehicleObservation[], visible: boolean, routeId: string | null, entityId: string | null, updateData = true) {
  const source = map.getSource(sourceId) as GeoJSONSource | undefined
  if (!source) return
  if (updateData) source.setData({
    type: 'FeatureCollection',
    features: observations.map((vehicle) => ({
      type: 'Feature',
      properties: { entityId: vehicleKey(vehicle), routeId: vehicle.reportedRouteId ?? '', color: getRouteDisplayColor(vehicle.reportedRouteId ?? '') },
      geometry: { type: 'Point', coordinates: [vehicle.longitude, vehicle.latitude] },
    })),
  })
  for (const layer of [circleLayer, vehicleHitLayer]) map.setLayoutProperty(layer, 'visibility', visible ? 'visible' : 'none')
  const selectedVehicle: ExpressionSpecification = ['==', ['get', 'entityId'], entityId ?? '']
  map.setPaintProperty(circleLayer, 'circle-radius', ['case', selectedVehicle, 6, 3.5])
  map.setPaintProperty(circleLayer, 'circle-opacity', routeId
    ? ['case', ['==', ['get', 'routeId'], routeId], 1, 0.2] : 0.9)
  map.setPaintProperty(circleLayer, 'circle-stroke-color', ['case', selectedVehicle, '#f1eee5', '#0b1212'])
}

function formatTime(value: string | number | null | undefined) {
  if (value === null || value === undefined) return 'Unavailable'
  const date = new Date(typeof value === 'number' ? value * 1000 : value)
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : 'Unavailable'
}

export function NetworkVehicles({ map, selectedRouteId }: { map: Map | null; selectedRouteId: string | null }) {
  const query = useVehicles()
  const [visible, setVisible] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const observations = query.data?.observations ?? emptyVehicles
  const selected = observations.find((vehicle) => vehicleKey(vehicle) === selectedId)
  const current = useRef({ observations, visible, selectedRouteId, selectedId })

  useEffect(() => {
    const updateData = current.current.observations !== observations
    current.current = { observations, visible, selectedRouteId, selectedId }
    if (map?.getSource(sourceId)) updateVehicles(map, observations, visible, selectedRouteId, selectedId, updateData)
  }, [map, observations, visible, selectedRouteId, selectedId])

  useEffect(() => {
    if (!map) return
    const click = (event: MapLayerMouseEvent) => {
      const id = event.features?.[0]?.properties?.entityId
      if (typeof id === 'string') setSelectedId(id)
    }
    const enter = () => { map.getCanvas().style.cursor = 'pointer' }
    const leave = () => { map.getCanvas().style.cursor = '' }
    const initialize = () => {
      map.addSource(sourceId, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({ id: circleLayer, source: sourceId, type: 'circle', paint: {
        'circle-radius': 3.5, 'circle-color': ['get', 'color'], 'circle-stroke-width': 1.2, 'circle-stroke-color': '#0b1212',
      } })
      map.addLayer({ id: vehicleHitLayer, source: sourceId, type: 'circle', paint: { 'circle-radius': 9, 'circle-opacity': 0 } })
      const state = current.current
      updateVehicles(map, state.observations, state.visible, state.selectedRouteId, state.selectedId)
      map.on('click', vehicleHitLayer, click)
      map.on('mouseenter', vehicleHitLayer, enter)
      map.on('mouseleave', vehicleHitLayer, leave)
    }
    if (map.isStyleLoaded()) initialize()
    else map.once('load', initialize)
    return () => {
      map.off('load', initialize)
      map.off('click', vehicleHitLayer, click)
      map.off('mouseenter', vehicleHitLayer, enter)
      map.off('mouseleave', vehicleHitLayer, leave)
      for (const layer of [vehicleHitLayer, circleLayer]) if (map.getLayer(layer)) map.removeLayer(layer)
      if (map.getSource(sourceId)) map.removeSource(sourceId)
    }
  }, [map])

  const status = query.isError ? 'Request error · data may be stale'
    : query.isPending ? 'Loading observations'
      : query.data?.status === 'empty' ? 'No observations collected'
        : query.data?.status === 'stale' ? 'Stale observations' : 'Current observations'

  return <div className={styles.overlay}>
    <div className={styles.status}>
      <label><input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} />Live vehicles</label>
      <span role="status">{status}</span>
      <span>Last collected: {formatTime(query.data?.snapshot?.fetchedAt)}</span>
      {query.data?.snapshot && <span>Feed updated: {formatTime(query.data.snapshot.feedTimestamp)}</span>}
      {query.data && <span>{observations.length.toLocaleString()} valid positions</span>}
    </div>
    {visible && selected && <aside className={styles.details} aria-label="Selected vehicle">
      <button type="button" onClick={() => setSelectedId(null)} aria-label="Close vehicle details">×</button>
      <strong>VEHICLE {selected.vehicleId ?? 'ID unavailable'}</strong>
      <span>Reported route: {selected.reportedRouteId ?? 'Unavailable'}</span>
      <span>Observed: {formatTime(selected.sourceTimestamp)}</span>
      {selected.matchedSurfaceTripId && <span>Confirmed SurfaceGTFS trip: {selected.matchedSurfaceTripId}</span>}
    </aside>}
  </div>
}
