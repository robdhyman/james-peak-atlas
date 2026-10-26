import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../public/', import.meta.url));
const json = async name => JSON.parse(await readFile(path.join(root, name), 'utf8'));
const manifest = await json('data/manifest.json');
const assets = [manifest.anchors, manifest.candidates, manifest.canopy_grid, manifest.method];
for (const [key, layer] of Object.entries(manifest.layers)) {
  assert(!/^https?:/.test(layer.url), `${key} unexpectedly depends on a remote asset`);
  assets.push(layer.url);
  if (layer.type === 'raster') {
    assert.equal(layer.bounds.length, 2, `${key} raster bounds`);
    const [[south,west],[north,east]] = layer.bounds;
    assert(south<north && west<east, `${key} raster bounds order`);
  }
}
const html = await readFile(path.join(root,'index.html'), 'utf8');
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) if (!match[1].startsWith('#')) assets.push(match[1]);
for (const asset of new Set(assets)) { assert(!asset.startsWith('/') && !asset.includes('..'), `Nonportable asset: ${asset}`); assert((await stat(path.join(root,asset))).size>0, `Empty asset: ${asset}`); }
const {features} = await json(manifest.candidates);
assert.equal(features.length,16,'Snapshot candidate count changed; update expected fixtures deliberately');
assert.equal(new Set(features.map(f=>f.properties.id)).size,16,'Duplicate candidate IDs');
let nearby=0;
for (const feature of features) {
  const p=feature.properties, m=p.metrics, c=p.components;
  assert.equal(feature.geometry.type,'Point');
  assert(feature.geometry.coordinates[0]<-100 && feature.geometry.coordinates[1]>30,'Coordinate order must be [longitude, latitude]');
  for (const component of Object.values(c)) assert(Number.isFinite(component)&&component>=0&&component<=100,'Component score range');
  const weighted=.35*c.water+.25*c.shelter+.25*c.darkness+.15*c.security;
  assert(Math.abs(weighted-p.score)<=.12,`${p.id}: weighted score (allow rounding)`);
  assert(m.canopy_percent>=30 && m.canopy_percent<=100 && m.slope_deg<=30);
  assert(m.water_distance_m>=30 && m.water_distance_m<=450 && m.darkness_m>=200);
  if (p.within_east_portal_straightline_budget) { nearby++; assert(m.roundtrip_lower_bound_miles<=6); }
}
assert.equal(nearby,6);
const order=features.filter(f=>f.properties.within_east_portal_straightline_budget).sort((a,b)=>a.properties.scout_order-b.properties.scout_order).map(f=>f.properties.id);
assert.deepEqual(order,['EP-04','EP-05','EP-03','EP-01','EP-06','EP-02']);
const canopy=await json(manifest.canopy_grid), pixels=Buffer.from(canopy.data_base64,'base64');
assert.equal(pixels.length,canopy.width*canopy.height);
assert.equal(canopy.nodata,255); assert.equal(canopy.year,2025);
assert(pixels.every(v=>v<=100 || v===255),'Canopy pixels must be percentages or NoData');
const contours=await json(manifest.layers.contours.url);
assert(contours.features.every(f=>f.properties.elevation_ft%40===0),'40-foot contour interval');
console.log(`PASS: ${new Set(assets).size} asset references, 16 candidate records, six nearby candidates, weighted scores, coordinate order, canopy decoding and 40-foot contours.`);
console.log('This checks package integrity and documented data contracts. It does not validate habitat quality, legal access or walking routes.');
