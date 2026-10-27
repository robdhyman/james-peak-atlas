// Checks the public build in dist/ before it can deploy (ADR 0001): the
// observations collection the manifest names is empty, and no file holds a
// CalTopo map link. CALTOPO_MAP_ID, if set (a CI secret, never committed),
// is searched for on its own too. Reads dist/ only, never private/.
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = fileURLToPath(new URL('../dist/', import.meta.url))
const CALTOPO_MAP_LINK = /caltopo\.com\/m(ap)?\//i
const mapId = process.env.CALTOPO_MAP_ID?.trim() || null

const manifest = JSON.parse(await readFile(join(dist, 'data/manifest.json'), 'utf8'))
const observations = JSON.parse(await readFile(join(dist, manifest.observations), 'utf8'))
assert.equal(observations.type, 'FeatureCollection', `dist/${manifest.observations}: not a FeatureCollection`)
assert.equal(
  observations.features.length,
  0,
  `dist/${manifest.observations}: ships ${observations.features.length} observations; the public build must ship none`,
)

const files = (await readdir(dist, { recursive: true, withFileTypes: true }))
  .filter((entry) => entry.isFile())
  .map((entry) => join(entry.parentPath, entry.name))
const leaks = []
for (const file of files) {
  // latin1 maps every byte to a character, so binary files are searched too.
  const text = (await readFile(file)).toString('latin1')
  const name = relative(dist, file)
  if (CALTOPO_MAP_LINK.test(text)) leaks.push(`${name} (a CalTopo map link)`)
  // The ID itself is never printed, so a failing log doesn't publish it either.
  if (mapId && text.includes(mapId)) leaks.push(`${name} (the CalTopo map ID)`)
}
assert.deepEqual(leaks, [], `dist/ holds CalTopo references:\n  ${leaks.join('\n  ')}`)

console.log(
  `PASS: dist/${manifest.observations} ships zero observations; ${files.length} files hold no CalTopo map link` +
    (mapId ? ' or map ID.' : '. (CALTOPO_MAP_ID is unset, so the bare ID was not searched for.)'),
)
