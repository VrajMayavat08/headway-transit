import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createVehicleIconImage,
  registerVehicleIconImages,
  vehicleIconImageId,
  vehicleIconKinds,
  vehicleIconPixelRatio,
  vehicleIconRotation,
  vehicleIconSize,
  type RgbaIconImage,
} from '../src/features/network/lib/vehicleIcons.ts'

test('vehicle icon generator creates distinct non-empty RGBA images', () => {
  const images = vehicleIconKinds.map((kind) => createVehicleIconImage(kind))
  for (const image of images) {
    assert.equal(image.width, vehicleIconSize)
    assert.equal(image.height, vehicleIconSize)
    assert.equal(image.data.length, vehicleIconSize * vehicleIconSize * 4)
    assert.ok(image.data.some((channel, index) => index % 4 === 3 && channel > 0))
  }
  assert.notDeepEqual(images[0]?.data, images[1]?.data)
  assert.notDeepEqual(images[1]?.data, images[2]?.data)
})

test('vehicle icons use subdued solid silhouettes without an ivory crosshair', () => {
  for (const kind of vehicleIconKinds) {
    const image = createVehicleIconImage(kind)
    const opaquePixels = Array.from({ length: image.width * image.height }, (_, index) => image.data[index * 4 + 3] ?? 0)
      .filter((alpha) => alpha > 0).length
    assert.ok(opaquePixels >= 100, `${kind} should have a substantial silhouette`)

    for (let index = 0; index < image.data.length; index += 4) {
      assert.notDeepEqual(Array.from(image.data.slice(index, index + 3)), [241, 238, 229], `${kind} should not use bright ivory pixels`)
    }
  }
})

test('registration synchronously installs every image ID referenced by vehicle symbol layers', () => {
  const images = new Map<string, RgbaIconImage>()
  const options = new Map<string, { pixelRatio: number } | undefined>()
  const registry = {
    hasImage: (id: string) => images.has(id),
    addImage: (id: string, image: RgbaIconImage, imageOptions?: { pixelRatio: number }) => {
      images.set(id, image)
      options.set(id, imageOptions)
    },
  }

  registerVehicleIconImages(registry)
  assert.deepEqual([...images.keys()], vehicleIconKinds.map(vehicleIconImageId))
  assert.deepEqual([...options.values()], vehicleIconKinds.map(() => ({ pixelRatio: vehicleIconPixelRatio })))

  registerVehicleIconImages(registry)
  assert.equal(images.size, vehicleIconKinds.length)
})

test('vehicle rotation uses only valid TTC bearing values', () => {
  assert.equal(vehicleIconRotation(0), 0)
  assert.equal(vehicleIconRotation(90), 90)
  assert.equal(vehicleIconRotation(360), 0)
  assert.equal(vehicleIconRotation(null), 0)
  assert.equal(vehicleIconRotation(-1), 0)
  assert.equal(vehicleIconRotation(361), 0)
})
