"""Assemble documented, locally served James Peak scouting layers."""
import json
import shutil
from pathlib import Path

SOURCE = Path('/workspace/scratch/4d04d3473d54/jpw_data')
DEST = Path(__file__).resolve().parents[1] / 'dist/data'
DEST.mkdir(parents=True, exist_ok=True)

def read(path):
    return json.loads((SOURCE / path).read_text())

def write(name, obj):
    (DEST / name).write_text(json.dumps(obj, separators=(',', ':'), ensure_ascii=False))

def copy(rel, name=None):
    name = name or Path(rel).name
    if name.endswith('.json') and name != 'canopy_grid.json':
        def clean(v):
            if isinstance(v, dict): return {k:clean(x) for k,x in v.items()}
            if isinstance(v, list): return [clean(x) for x in v]
            if isinstance(v, str) and v.startswith('/workspace/'): return Path(v).name
            return v
        write(name, clean(read(rel)))
    else:
        shutil.copyfile(SOURCE / rel, DEST / name)
    return 'data/' + name

layers = {}
def geo(key, rel, label, description, source):
    layers[key] = dict(url=copy(rel), type='geojson', label=label, description=description, source=source)

geo('boundary','access/boundary.geojson','James Peak Wilderness','Official USFS wilderness boundary.','USFS EDW')
geo('trails','access/trails.geojson','Trails','USFS and USGS mapped trails; closures and unmapped paths are not resolved.','USFS EDW / USGS TNM')
geo('roads','access/roads.geojson','Roads','Mapped roads include roads unsuitable for your Mazda. A line does not establish legal motor access.','USFS EDW / USGS TNM')
geo('campgrounds','access/campgrounds.geojson','Developed campgrounds','Two mapped developed sites in the surrounding buffer. Dispersed camps are not inventoried. Status is a retrieval snapshot.','USFS recreation inventory')
geo('trailheads','access/trailheads.geojson','Trailheads / vehicle screen','East Portal is your confirmed origin. High-clearance approaches are explicitly excluded from the vehicle screen.','USFS recreation inventory / user')
geo('gmu_boundaries','access/gmu_boundaries.geojson','GMU boundaries','Context only; a GMU does not establish license or access validity.','Colorado Parks and Wildlife')
geo('ownership','access/ownership.geojson','Mapped land ownership','PAD-US fee ownership inventory; not a cadastral survey or access authorization.','USGS PAD-US')
geo('contours','terrain/contours_40ft.geojson','40 ft contour lines','Exact 40-foot elevation intervals derived from USGS 3DEP; heavy lines every 200 feet.','USGS 3DEP, sampled at 10 m')
water = {'type':'FeatureCollection','features':[]}
for f in ['streams','lakes','water_points']:
    water['features'] += [x for x in read(f'access/{f}.geojson')['features'] if x['properties'].get('type') != 'gate']
write('water.geojson', water)
layers['water'] = dict(url='data/water.geojson',type='geojson',label='Mapped water',description='Solid perennial, dashed intermittent/ephemeral, gray unknown or artificial. Historical NHD classes are not a 2027 flow forecast.',source='USGS NHD High Resolution; maintenance retired in 2023')
terrain = read('terrain/terrain_metadata.json')
canopy = read('terrain/canopy_metadata.json')
layers['hillshade'] = dict(url=copy('terrain/hillshade.png'),type='raster',bounds=terrain['png_bounds_leaflet'],label='Terrain relief',description='USGS 3DEP elevation hillshade.',source='USGS 3DEP')
layers['canopy'] = dict(url=copy('terrain/canopy.png'),type='raster',bounds=canopy['png_bounds'],label=f"Canopy cover · {canopy['year']}",description='Actual modeled tree canopy percentage, 0–100%, at approximately 30 m. Does not measure understory cover.',source=f"USFS NLCD {canopy['year']}",legend=canopy['legend'])
copy('terrain/canopy_grid.json')
copy('terrain/canopy_metadata.json')
copy('terrain/terrain_metadata.json')
for o in read('model/overlays.json'):
    key = {'darkness_distance':'darkness','overall_score':'overall_score'}.get(o['id'],o['id'])
    labels={'darkness':'Darkness · distance from access','water_score':'Water potential','shelter_score':'Shelter potential','security_score':'Terrain security','overall_score':'Combined scouting index'}
    layers[key]=dict(url=copy('model/'+o['file']),type='raster',bounds=o['bounds'],label=labels[key],description=o['legend'],source='Transparent scouting model · 60 m grid',legend=dict(min=o['min'],max=o['max'],text=o['legend']))
    layers[key]['legend']['gradient']={
      'darkness':'#fcfbfd,#dadaeb,#9e9ac8,#6950a3,#3f007d',
      'water_score':'#f7fbff,#c6dbef,#6aaed6,#2070b4,#08306b',
      'shelter_score':'#f7fcf5,#c7e9c0,#73c476,#228a44,#00441b',
      'security_score':'#fff5eb,#fdd0a2,#fd8c3b,#d84801,#7f2704',
      'overall_score':'#ffffd9,#c6e9b4,#40b5c4,#225da8,#081d58'}[key]
layers['darkness_score']={**layers['darkness'], 'label':'Darkness component'}
if (SOURCE/'terrain/usgs_topo_metadata.json').exists():
    topo=read('terrain/usgs_topo_metadata.json')
    copy('terrain/usgs_topo_metadata.json')
    # The terrain owner records a single Web Mercator mosaic and Leaflet bounds.
    file=topo.get('webp_path',topo.get('file',topo.get('image_path',topo.get('png_path','usgs_topo_40ft.webp'))))
    bounds=topo.get('bounds',topo.get('png_bounds_leaflet',topo.get('bounds_leaflet')))
    layers['official_topo']=dict(url=copy('terrain/'+Path(file).name),type='raster',bounds=bounds,label='USGS topo · 40 ft · 2022',description='Six official 2022 quadrangles with 40-foot contours. Original map trails and water remain printed here even when separate overlays are off.',source='USGS US Topo')

raw = read('model/candidates.json')
near = SOURCE/'model/nearby_candidates.json'
if near.exists():
    extras=json.loads(near.read_text())
    seen={(c['latitude'],c['longitude']) for c in raw}
    raw += [c for c in extras if (c['latitude'],c['longitude']) not in seen]
candidates=[]
near_order={c['id']:i+1 for i,c in enumerate(sorted([c for c in raw if c['within_east_portal_straightline_budget']],key=lambda c:c['metrics']['east_portal_minimum_roundtrip_miles']))}
for c in raw:
    p=dict(c)
    p['scout_order']=near_order.get(p['id'],99)
    if p['id']=='EP-04':
        p['rationale'].insert(0,'First access check: shortest straight-line distance from East Portal among the six alternatives. Actual trail distance and elevation still need checking.')
    m=p['metrics']
    m.update(darkness_m=m['nearest_access_m'],slope_deg=m['slope_degrees'],from_east_portal_m=m['east_portal_straight_miles']*1609.344,roundtrip_lower_bound_miles=m['east_portal_minimum_roundtrip_miles'],water_kind=p['water']['regime']+' '+p['water']['type'].replace('_',' '))
    p['gmu']=', '.join(map(str,p['land']['gmu']))
    p['cautions']=['Route unverified: straight-line distance is only a lower bound.','Mapped perennial water can still be dry in the 2027 scenario.','Terrain security is a proxy; confirm approach, escape routes and recovery on foot.']
    if not p['within_east_portal_straightline_budget']:
        p['cautions'].insert(0,'Outside your six-mile round-trip limit from East Portal even in a straight line. Wider-area context only.')
    candidates.append(dict(type='Feature',geometry=dict(type='Point',coordinates=[p['longitude'],p['latitude']]),properties=p))
write('candidates.geojson',dict(type='FeatureCollection',features=candidates))
anchors=[]
for ident,name,lat,lon,note,kind in [
 # REDACTED for public release (ADR 0001): the original A1–A3 observation tuples stood here.
 # The owner's copy is in the git-ignored private/ folder.
 ('TH','Moffat Tunnel / East Portal lot',39.9017,-105.6453,'Confirmed parking origin. The older CalTopo parking pin farther east is not used.','trailhead')]:
    anchors.append(dict(type='Feature',geometry=dict(type='Point',coordinates=[lon,lat]),properties=dict(id=ident,name=name,note=note,observed='October 2025' if kind=='anchor' else '',kind=kind)))
write('anchors.geojson',dict(type='FeatureCollection',features=anchors))
for rel in ['model/method.json','model/model_summary.json','access/retrieval_manifest.json','access/normalized_summary.json']:
    copy(rel)
sources=[
 dict(name='USFS wilderness boundary, trails, roads and recreation',url='https://data.fs.usda.gov/geodata/edw/datasets.php',vintage='Inventory retrieved October 2026; individual road vintages vary',note='Road geometry is not a legal-access or vehicle-condition determination.'),
 dict(name='Official USGS US Topo quadrangles',url='https://www.usgs.gov/programs/national-geospatial-program/us-topo-maps-america',vintage='Six 2022 quadrangles',note='All six explicitly use 40-foot contour intervals. Local georeferenced mosaic; no remote tiles.'),
 dict(name='USGS 3D Elevation Program',url='https://www.usgs.gov/3d-elevation-program',vintage='Retrieved October 2026; mixed source vintages',note='Elevation sampled at 10 m; supports hillshade, derived contours and slope proxies.'),
 dict(name='USFS NLCD percent tree canopy',url='https://data.fs.usda.gov/geodata/rastergateway/treecanopycover/',vintage='Mapped year 2025 · release v2025-6 · published 2026',note='Continuous 0–100% canopy estimates at about 30 m. Zero is valid; missing pixels are not treated as zero.'),
 dict(name='USGS National Hydrography Dataset',url='https://www.usgs.gov/national-hydrography/national-hydrography-dataset',vintage='Legacy NHD High Resolution; retired October 2023',note='Perennial is a historical classification, not measured water availability in 2027.'),
 dict(name='USGS PAD-US fee ownership',url='https://www.usgs.gov/programs/gap-analysis-project/science/pad-us-data-overview',vintage='Current service snapshot retrieved October 2026',note='Candidate filter uses mapped USFS fee land within the wilderness; inventory boundaries do not grant access.'),
 dict(name='CPW game management units',url='https://cpw.state.co.us/maps',vintage='Retrieved October 2026',note='2027 season, hunt code and closure rules require the applicable regulations.'),
 # REDACTED for public release (ADR 0001): the CalTopo map URL is withheld; provenance wording kept.
 dict(name='Your CalTopo and observations',vintage='Observations October 2025',note='Three supplied coordinates retained exactly; 2027 elk occupancy accepted as the planning assumption.')]
b=read('access/extent.json')['boundary_bounds_wgs84']
manifest=dict(title='James Peak Scouting Atlas',updated='2026-10-26',bounds=[[b[1],b[0]],[b[3],b[2]]],scenario='2027 low water · elk occupancy assumed',layers=layers,candidates='data/candidates.geojson',anchors='data/anchors.geojson',canopy_grid='data/canopy_grid.json',sources=sources,method='data/method.json',constraints=dict(roundtrip_miles=6,gain_ft=4000,vehicle='AWD Mazda 3; no high-clearance approaches',origin='Moffat Tunnel / East Portal lot'))
write('manifest.json',manifest)
print(json.dumps(dict(layers=len(layers),candidates=len(candidates),canopy_year=canopy['year'],official_topo='official_topo' in layers)))
