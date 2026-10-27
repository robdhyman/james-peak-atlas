import { readFile } from 'node:fs/promises'
import { describe, expect, test } from 'vitest'
import { featurePopup } from './featurePopup.ts'

const PUBLIC = new URL('../../public/data/', import.meta.url)

/** The properties of the first feature in a bundled layer that matches. */
async function bundled(file: string, match: (properties: Record<string, unknown>) => boolean) {
  const { features } = JSON.parse(await readFile(new URL(file, PUBLIC), 'utf8')) as {
    features: { properties: Record<string, unknown> }[]
  }
  const feature = features.find(({ properties }) => match(properties))
  if (!feature) throw new Error(`no matching feature in ${file}`)
  return feature.properties
}

describe('feature popups from the real bundle', () => {
  test('a trail is named, with its surface and type', async () => {
    const trail = await bundled('trails.geojson', (p) => p['name'] === 'SECOND CREEK')
    expect(featurePopup('trails', trail, 'Trails')).toEqual({ title: 'SECOND CREEK', meta: 'NATIVE MATERIAL · trail', notes: [] })
  })

  test('a road says its line does not establish vehicle access', async () => {
    const road = await bundled('roads.geojson', (p) => p['name'] === 'E Park Ave')
    expect(featurePopup('roads', road, 'Roads')).toEqual({
      title: 'E Park Ave',
      meta: 'secondary highway',
      notes: ['Road geometry does not establish vehicle access.'],
    })
  })

  test('water gives its regime and type, and that 2027 flow is not verified', async () => {
    const spring = await bundled('water.geojson', (p) => p['type'] === 'spring_seep')
    expect(featurePopup('water', spring, 'Mapped water')).toEqual({
      title: 'Spring Seep',
      meta: 'unknown · spring seep',
      notes: ['Mapped feature; 2027 flow not verified.'],
    })
  })

  test('a trailhead shows its vehicle note', async () => {
    const trailhead = await bundled('trailheads.geojson', (p) => p['name'] === 'Berthoud Pass Trailhead')
    expect(featurePopup('trailheads', trailhead, 'Trailheads')?.notes).toEqual([
      'USFS directions place parking directly beside US-40; 2027 weather and opening still unverified.',
    ])
  })

  test('a campground shows its inventory status and its own note', async () => {
    const campground = await bundled('campgrounds.geojson', (p) => p['name'] === 'Mizpah Campground')
    expect(featurePopup('campgrounds', campground, 'Developed campgrounds')?.notes).toEqual([
      'Inventory status: CLOSED',
      'Snapshot status is not a 2027 opening forecast.',
    ])
  })

  test('a GMU is numbered', async () => {
    const gmu = await bundled('gmu_boundaries.geojson', (p) => p['gmu'] === 28)
    expect(featurePopup('gmu_boundaries', gmu, 'GMU boundaries')).toEqual({ title: 'GMU 28', meta: 'GMU 28', notes: [] })
  })
})

describe('feature popups for thin properties', () => {
  test('a feature with no name takes the layer label', () => {
    expect(featurePopup('trails', { name: '  ' }, 'Trails')?.title).toBe('Trails')
    expect(featurePopup('water', null, 'Mapped water')?.title).toBe('Mapped water')
  })

  test('a campground with no note says it is not an opening forecast', () => {
    expect(featurePopup('campgrounds', {}, 'Developed campgrounds')?.notes).toEqual(['Inventory status: Unknown', 'Not a 2027 opening forecast.'])
  })

  test('a trailhead with no vehicle note says the approach is unverified', () => {
    expect(featurePopup('trailheads', {}, 'Trailheads')?.notes).toEqual(['Vehicle approach unverified.'])
  })

  test('values that are not text or finite numbers are left out of the metadata', () => {
    expect(featurePopup('trails', { surface: { bad: true }, type: Number.NaN, access: 'open' }, 'Trails')?.meta).toBe('open')
  })

  test('markup in a property stays as text for the adapter to render', () => {
    expect(featurePopup('trails', { name: '<img src=x onerror=alert(1)>' }, 'Trails')?.title).toBe('<img src=x onerror=alert(1)>')
  })

  test('contours, ownership and the wilderness boundary open nothing', () => {
    for (const key of ['contours', 'ownership', 'boundary']) expect(featurePopup(key, { name: 'x' }, 'x')).toBeNull()
  })
})
