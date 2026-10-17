export const vehicleIconKinds = ['bus', 'streetcar', 'vehicle'] as const
export type VehicleIconKind = (typeof vehicleIconKinds)[number]

export type RgbaIconImage = {
  width: number
  height: number
  data: Uint8Array
}

type Rgba = readonly [number, number, number, number]
type ImageRegistry = {
  hasImage: (id: string) => boolean
  addImage: (id: string, image: RgbaIconImage, options?: { pixelRatio: number }) => unknown
}

export const vehicleIconSize = 64
export const vehicleIconPixelRatio = 2
const ivory: Rgba = [232, 228, 214, 255]
const red: Rgba = [200, 67, 65, 255]
const roof: Rgba = [165, 180, 174, 255]
const windshield: Rgba = [28, 43, 42, 255]
const graphite: Rgba = [7, 14, 14, 255]

function setPixel(image: RgbaIconImage, x: number, y: number, color: Rgba) {
  if (x < 0 || x >= image.width || y < 0 || y >= image.height) return
  const offset = (y * image.width + x) * 4
  image.data.set(color, offset)
}

function fillRect(image: RgbaIconImage, left: number, top: number, right: number, bottom: number, color: Rgba) {
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) setPixel(image, x, y, color)
  }
}

function fillRoundedRect(image: RgbaIconImage, left: number, top: number, right: number, bottom: number, radius: number, color: Rgba) {
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const nearestX = Math.max(left + radius, Math.min(x, right - radius))
      const nearestY = Math.max(top + radius, Math.min(y, bottom - radius))
      if ((x - nearestX) ** 2 + (y - nearestY) ** 2 <= radius ** 2) setPixel(image, x, y, color)
    }
  }
}

function drawBus(image: RgbaIconImage) {
  // Top-down bus: forward is image-up so MapLibre bearing 0 faces north.
  fillRoundedRect(image, 16, 5, 47, 58, 8, graphite)
  fillRoundedRect(image, 19, 8, 44, 55, 6, ivory)
  fillRoundedRect(image, 22, 10, 41, 20, 3, windshield)
  fillRect(image, 20, 25, 43, 29, red)
  fillRoundedRect(image, 23, 33, 40, 43, 2, roof)
  fillRect(image, 23, 46, 40, 49, windshield)
}

function drawStreetcar(image: RgbaIconImage) {
  // Long, narrow articulated rail vehicle with three roof segments.
  fillRoundedRect(image, 20, 3, 43, 60, 6, graphite)
  fillRoundedRect(image, 23, 6, 40, 57, 4, ivory)
  fillRoundedRect(image, 25, 8, 38, 17, 2, windshield)
  fillRect(image, 24, 21, 39, 24, red)
  fillRoundedRect(image, 25, 28, 38, 35, 1, roof)
  fillRect(image, 23, 38, 40, 40, graphite)
  fillRoundedRect(image, 25, 43, 38, 50, 1, roof)
  fillRect(image, 25, 53, 38, 55, red)
}

function drawNeutralVehicle(image: RgbaIconImage) {
  // Generic top-down transit vehicle without bus or rail-specific details.
  fillRoundedRect(image, 18, 10, 45, 54, 8, graphite)
  fillRoundedRect(image, 21, 13, 42, 51, 5, ivory)
  fillRoundedRect(image, 24, 15, 39, 24, 3, windshield)
  fillRect(image, 22, 29, 41, 32, red)
  fillRoundedRect(image, 25, 36, 38, 44, 2, roof)
}

export function vehicleIconImageId(kind: VehicleIconKind) {
  return `headway-live-vehicle-${kind}`
}

export function createVehicleIconImage(kind: VehicleIconKind): RgbaIconImage {
  const image = {
    width: vehicleIconSize,
    height: vehicleIconSize,
    data: new Uint8Array(vehicleIconSize * vehicleIconSize * 4),
  }
  if (kind === 'bus') drawBus(image)
  else if (kind === 'streetcar') drawStreetcar(image)
  else drawNeutralVehicle(image)
  return image
}

export function registerVehicleIconImages(registry: ImageRegistry) {
  for (const kind of vehicleIconKinds) {
    const id = vehicleIconImageId(kind)
    if (!registry.hasImage(id)) registry.addImage(id, createVehicleIconImage(kind), { pixelRatio: vehicleIconPixelRatio })
  }
}

export function vehicleIconRotation(bearing: number | null) {
  if (bearing === null || !Number.isFinite(bearing) || bearing < 0 || bearing > 360) return 0
  return bearing === 360 ? 0 : bearing
}
