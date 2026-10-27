// Checks the rebuild's data copy in public/data against the reference copy.
// Only the manifest and the observations file may differ (ADR 0001); the
// reference package's own check covers the data contracts themselves.
import assert from 'node:assert/strict'
import { readdir, readFile, stat } from 'node:fs/promises'

const rebuild = new URL('../public/', import.meta.url)
const reference = new URL('../reference/public/data/', import.meta.url)
const CHANGED = new Set(['manifest.json', 'observations.geojson'])

const manifest = JSON.parse(await readFile(new URL('data/manifest.json', rebuild), 'utf8'))
const urls = [
  manifest.candidates,
  manifest.observations,
  manifest.canopy_grid,
  manifest.method,
  ...Object.values(manifest.layers).map((layer) => layer.url),
]
for (const url of urls) {
  assert(typeof url === 'string', `manifest: missing data URL in ${JSON.stringify(urls)}`)
  assert(!/^[a-z]+:|^\/|\.\./i.test(url), `manifest: ${url} must be relative to the site base`)
  assert((await stat(new URL(url, rebuild))).size > 0, `manifest: ${url} is empty`)
}

const files = (await readdir(new URL('data/', rebuild))).filter((name) => !name.startsWith('.'))
const referenceFiles = (await readdir(reference)).filter((name) => !name.startsWith('.'))
const expected = referenceFiles.filter((name) => name !== 'anchors.geojson').concat('observations.geojson')
assert.deepEqual(files.toSorted(), expected.toSorted(), 'public/data: file set differs from the reference data')

for (const name of files.filter((name) => !CHANGED.has(name))) {
  const [ours, theirs] = await Promise.all([readFile(new URL(`data/${name}`, rebuild)), readFile(new URL(name, reference))])
  assert(ours.equals(theirs), `public/data/${name}: differs from the reference copy`)
}

console.log(`PASS: ${urls.length} relative manifest URLs; ${files.length - CHANGED.size} data files byte-identical to the reference.`)
