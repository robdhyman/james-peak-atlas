from pathlib import Path
import sys,json,math,hashlib
sys.path.insert(0,'/workspace/scratch/4d04d3473d54/gis_python')
import numpy as np
from scipy.ndimage import distance_transform_edt,convolve
import rasterio
from rasterio.features import rasterize
from rasterio.transform import from_origin
from rasterio.warp import reproject,Resampling,calculate_default_transform
from shapely.geometry import shape,mapping,Point
from shapely.ops import transform,unary_union
from shapely import make_valid
from pyproj import Transformer,Geod
from PIL import Image
import matplotlib;matplotlib.use('Agg')
from matplotlib import colormaps

ROOT=Path('/workspace/scratch/4d04d3473d54')
B=ROOT/'jpw_data';A=B/'access';T=B/'terrain';O=B/'model'
O.mkdir(exist_ok=True)
CRS='EPSG:26913';RES=60.0;GEOD=Geod(ellps='WGS84')
proj=Transformer.from_crs(4326,26913,always_xy=True).transform
inv=Transformer.from_crs(26913,4326,always_xy=True).transform
def readfc(path):return json.loads(path.read_text())['features']
def dump(name,d): (O/name).write_text(json.dumps(d,indent=2)+'\n')
def features(path):
 out=[]
 for f in readfc(path):
  if f.get('geometry'):
   g=transform(proj,make_valid(shape(f['geometry'])))
   if not g.is_empty:out.append((g,f.get('properties',{})))
 return out

boundary=unary_union([g for g,p in features(A/'boundary.geojson')])
buffer=boundary.buffer(3000)
xmin,ymin,xmax,ymax=buffer.bounds
xmin=math.floor(xmin/RES)*RES;ymin=math.floor(ymin/RES)*RES
xmax=math.ceil(xmax/RES)*RES;ymax=math.ceil(ymax/RES)*RES
W=int((xmax-xmin)/RES);H=int((ymax-ymin)/RES);TR=from_origin(xmin,ymax,RES,RES)
def rast(geoms,all_touched=False):
 gs=[(g,1) for g in geoms if not g.is_empty]
 return rasterize(gs,out_shape=(H,W),transform=TR,fill=0,dtype='uint8',all_touched=all_touched).astype(bool) if gs else np.zeros((H,W),bool)
inside=rast([boundary])
def resample(path,resampling=Resampling.bilinear):
 with rasterio.open(path) as src:
  out=np.full((H,W),np.nan,dtype='float32')
  reproject(rasterio.band(src,1),out,src_transform=src.transform,src_crs=src.crs,src_nodata=src.nodata,dst_transform=TR,dst_crs=CRS,dst_nodata=np.nan,resampling=resampling)
 return out
def distance(geoms):
 mask=rast(geoms,True)
 return distance_transform_edt(~mask,sampling=RES).astype('float32') if mask.any() else np.full((H,W),np.nan,dtype='float32')
def tiff(name,data):
 with rasterio.open(O/name,'w',driver='GTiff',height=H,width=W,count=1,dtype='float32',crs=CRS,transform=TR,nodata=-9999,compress='deflate') as dst:dst.write(np.where(inside & np.isfinite(data),data,-9999).astype('float32'),1)
def overlay(name,data,cmap,vmin,vmax,legend):
 dt,dw,dh=calculate_default_transform(CRS,'EPSG:3857',W,H,xmin,ymin,xmax,ymax)
 dest=np.full((dh,dw),np.nan,dtype='float32')
 src=np.where(inside & np.isfinite(data),data,np.nan).astype('float32')
 reproject(src,dest,src_transform=TR,src_crs=CRS,src_nodata=np.nan,dst_transform=dt,dst_crs='EPSG:3857',dst_nodata=np.nan,resampling=Resampling.nearest)
 v=np.clip((dest-vmin)/(vmax-vmin),0,1)
 rgba=(colormaps[cmap](np.nan_to_num(v))*255).astype('uint8');rgba[:,:,3]=np.where(np.isfinite(dest),np.clip(80+v*130,0,210),0).astype('uint8')
 Image.fromarray(rgba).save(O/(name+'.png'),optimize=True)
 west,north=Transformer.from_crs(3857,4326,always_xy=True).transform(dt.c,dt.f)
 east,south=Transformer.from_crs(3857,4326,always_xy=True).transform(dt.c+dt.a*dw,dt.f+dt.e*dh)
 return {'id':name,'file':name+'.png','bounds':[[south,west],[north,east]],'min':vmin,'max':vmax,'legend':legend,'image_crs':'EPSG3857','resolution_m_ground_approx':RES,'nodata':'transparent','palette':[colormaps[cmap](v)[:3] for v in [0,.25,.5,.75,1]]}

def main():
 # Input names may be changed only to match verified acquisition outputs.
 trails=features(A/'trails.geojson');roads=features(A/'roads.geojson');camps=features(A/'campgrounds.geojson')
 streams=[(g,p) for g,p in features(A/'streams.geojson') if p.get('type')=='stream_river']
 lakes=[(g,p) for g,p in features(A/'lakes.geojson') if p.get('type') not in ['ice_mass','swamp_marsh']]
 springs=[(g,p) for g,p in features(A/'water_points.geojson') if p.get('type')=='spring_seep']
 dem=resample(T/'dem_10m.tif');slope=resample(T/'slope_degrees.tif');canopy=resample(T/'canopy.tif')
 canopy[(canopy<0)|(canopy>100)]=np.nan
 traildist=distance([g for g,p in trails]);roaddist=distance([g for g,p in roads]);campdist=distance([g for g,p in camps])
 accessdist=np.fmin(np.fmin(traildist,roaddist),campdist)
 # Prioritize perennial classification. If hydrography leaves all lakes unknown,
 # unknown water is retained only as lower-confidence fallback, never made perennial.
 perennial=[(g,p) for g,p in streams+lakes+springs if p.get('water_regime')=='perennial']
 intermittent=[(g,p) for g,p in streams+lakes+springs if p.get('water_regime') in ['intermittent','ephemeral']]
 unknown=[(g,p) for g,p in streams+lakes+springs if p.get('water_regime') not in ['perennial','intermittent','ephemeral']]
 permanentdist=distance([g for g,p in perennial]);intermittentdist=distance([g for g,p in intermittent]);unknowndist=distance([g for g,p in unknown])
 nearpermanent=100*np.clip(1-permanentdist/600,0,1)
 nearunknown=55*np.clip(1-unknowndist/400,0,1)
 nearintermittent=25*np.clip(1-intermittentdist/250,0,1)
 waterscore=np.fmax(np.fmax(nearpermanent,nearunknown),nearintermittent)
 waterscore=np.nan_to_num(waterscore,nan=0)
 # Broad understory/bedding cover is not observed. Canopy is a proxy only.
 shelterscore=np.clip((canopy-10)/60,0,1)*100
 darknessscore=np.clip((accessdist-100)/900,0,1)*100
 steep=(slope>=25)&np.isfinite(slope)
 radius_cells=int(math.ceil(200/RES));offset=np.arange(-radius_cells,radius_cells+1)*RES
 kx,ky=np.meshgrid(offset,offset);kernel=(np.hypot(kx,ky)<=200).astype('float32')
 steepfraction=convolve(steep.astype('float32'),kernel,mode='constant',cval=0)/np.maximum(convolve(np.isfinite(slope).astype('float32'),kernel,mode='constant',cval=0),1)
 # Intermediate nearby steep terrain earns protection; very extensive steep
 # terrain is discounted. This is not a validated movement/escape model.
 protection=np.minimum(np.clip(steepfraction/.35,0,1),np.clip((.85-steepfraction)/.3,0,1))*100
 local_accessibility=np.clip((35-slope)/20,0,1)
 securityscore=protection*local_accessibility
 overall=.35*waterscore+.25*shelterscore+.25*darknessscore+.15*securityscore
 waterpoly=rast([g for g,p in lakes],True)
 usfsfc=A/'padus_fee.geojson'
 usfs=[g for g,p in features(usfsfc) if p.get('Own_Name')=='USFS' or (p.get('Own_Type')=='FED' and p.get('Mang_Name')=='USFS')]
 usfsmask=rast(usfs)
 anchors=readfc(ROOT/'reconciliation/site_points_user.geojson')
 anchor_xy=[proj(*f['geometry']['coordinates'][:2]) for f in anchors]
 xs=xmin+(np.arange(W)+.5)*RES;ys=ymax-(np.arange(H)+.5)*RES
 xx,yy=np.meshgrid(xs,ys)
 anchordist=np.min([np.hypot(xx-x,yy-y) for x,y in anchor_xy],axis=0)
 valid=inside&usfsmask&~waterpoly&np.isfinite(canopy)&np.isfinite(slope)&(slope<=30)&(canopy>=30)&(accessdist>=200)&(permanentdist<=450)&(permanentdist>=30)&(anchordist>=250)&(waterscore>=25)&(securityscore>=20)
 # Rank qualifying pixels in two pools. Nearby candidates are reserved first;
 # whole-wilderness context excludes their neighborhoods to avoid duplicates.
 lon_grid,lat_grid=inv(xx,yy)
 _,_,origin_distance=GEOD.inv(np.full(xx.shape,-105.6453),np.full(xx.shape,39.9017),lon_grid,lat_grid)
 order=np.argsort(np.where(valid,overall,-np.inf).ravel())[::-1]
 water_union=unary_union([g for g,p in perennial]);access_union=unary_union([g for g,p in trails+roads+camps])
 def select(limit,nearby=False,exclude=None):
  chosen=[]
  for idx in order:
   r,c=np.unravel_index(idx,(H,W))
   if not valid[r,c]:break
   if nearby and origin_distance[r,c]>3*1609.344:continue
   x,y=xx[r,c],yy[r,c];point=Point(x,y)
   if not 30<=water_union.distance(point)<=450:continue
   if access_union.distance(point)<200:continue
   if all(math.hypot(x-q['x'],y-q['y'])>=400 for q in chosen+(exclude or [])):
    chosen.append({'r':int(r),'c':int(c),'x':float(x),'y':float(y),'pool':'nearby' if nearby else 'wilderness_context'})
    if len(chosen)>=limit:break
  return chosen
 nearby_chosen=select(6,nearby=True)
 chosen=nearby_chosen+select(10,exclude=nearby_chosen)
 gmus=features(A/'gmu_boundaries.geojson')
 candidates=[]
 ranks={'nearby':0,'wilderness_context':0}
 for q in chosen:
  ranks[q['pool']]+=1;i=ranks[q['pool']]
  r,c=q['r'],q['c'];lon,lat=inv(q['x'],q['y']);point=Point(q['x'],q['y'])
  nearestwater=min(perennial,key=lambda gp:gp[0].distance(point)) if perennial else None
  p=nearestwater[1] if nearestwater else {};wd=nearestwater[0].distance(point) if nearestwater else None
  _,_,from_origin=GEOD.inv(-105.6453,39.9017,lon,lat)
  gmumatches=[p2 for g,p2 in gmus if g.covers(point)]
  gmuids=[x.get('gmu','unknown') for x in gmumatches]
  name=p.get('name') or p.get('GNIS_Name') or 'Unnamed perennial water'
  if name in ['Stream River','Lake Pond']:
   name='Unnamed mapped stream' if p.get('type')=='stream_river' else 'Unnamed mapped lake'
  access_exact=min([g.distance(point) for g,p0 in trails+roads+camps]) if trails+roads+camps else None
  needs_alt=from_origin>3*1609.344
  cand={
   'id':f'EP-{i:02d}' if q['pool']=='nearby' else f'JP-{i:02d}','rank':i,'pool':q['pool'],'name':f'East Portal scout {i} — {name}' if q['pool']=='nearby' else f'Wilderness context {i} — {name}',
   'latitude':round(lat,6),'longitude':round(lon,6),'score':round(float(overall[r,c]),1),
   'score_kind':'Unvalidated scouting opportunity index 0–100; not probability',
   'components':{'water':round(float(waterscore[r,c]),1),'shelter':round(float(shelterscore[r,c]),1),'security':round(float(securityscore[r,c]),1),'darkness':round(float(darknessscore[r,c]),1)},
   'metrics':{'water_distance_m':round(wd,1) if wd is not None else None,'nearest_access_m':round(access_exact,1) if access_exact is not None else None,'trail_distance_m':round(float(traildist[r,c]),1) if np.isfinite(traildist[r,c]) else None,'road_distance_m':round(float(roaddist[r,c]),1) if np.isfinite(roaddist[r,c]) else None,'campground_distance_m':round(float(campdist[r,c]),1) if np.isfinite(campdist[r,c]) else None,'canopy_percent':round(float(canopy[r,c]),1),'slope_degrees':round(float(slope[r,c]),1),'nearby_steep_terrain_percent':round(float(steepfraction[r,c]*100),1),'elevation_ft':round(float(dem[r,c]*3.280839895)),'east_portal_straight_miles':round(from_origin/1609.344,2),'east_portal_minimum_roundtrip_miles':round(2*from_origin/1609.344,2)},
   'water':{'name':name,'regime':'perennial','type':p.get('type','unknown'),'source_id':p.get('source_id'),'note':'Mapped classification; verify wet in low-water scenario.'},
   'land':{'wilderness':'James Peak Wilderness','mapped_fee_owner':'USFS','gmu':gmuids,'access_verified':False,'access_note':'Mapped ownership is established; route-specific access and current rules remain unverified.'},
   'route_status':'Over six-mile round-trip lower bound from East Portal; alternate legal origin or larger travel budget needed' if needs_alt else 'Exact route, cumulative gain, road suitability and recovery access unverified',
   'within_east_portal_straightline_budget':not needs_alt,
   'rationale':[f'Mapped perennial {p.get("type","water")} approximately {round(wd)} m away; verify it remains wet.',f'{round(float(canopy[r,c]))}% tree canopy at the grid cell; understory cover requires field inspection.',f'Approximately {round(access_exact)} m from the nearest mapped road, trail or developed campground.',f'{round(float(steepfraction[r,c]*100))}% of nearby terrain meets the steep-slope threshold; local slope {round(float(slope[r,c]))}°.'],
   'field_checks':['Water present during dry conditions','Usable cover and dated elk sign','Legal foot approach and camera placement','Actual route mileage, cumulative gain and recovery access','Unmapped routes, dispersed camps and human use'],
   'status':'Unvisited hypothesis','observed_elk_at_candidate':False,
  }
  components=cand['components'];weakest=min(components,key=components.get)
  strengths=sorted(components,key=components.get,reverse=True)[:2]
  cand['model_strengths']=strengths
  cand['model_limiting_factor']=weakest
  cand['rationale'].insert(0,f'This cell ranks chiefly on {" and ".join(strengths)}; its lowest modeled component is {weakest} ({components[weakest]:.0f}/100).')
  candidates.append(cand)
 overlays=[]
 layers=[('darkness_distance',accessdist,'Purples',0,2000,'Meters from nearest mapped trail, road or developed campground; 2000+ saturated'),('water_score',waterscore,'Blues',0,100,'Low-water proximity/permanence index0–100'),('shelter_score',shelterscore,'Greens',0,100,'Canopy-derived shelter index0–100'),('security_score',securityscore,'Oranges',0,100,'Unvalidated terrain-protection index0–100'),('overall_score',overall,'YlGnBu',0,100,'Weighted scouting opportunity index0–100')]
 for name,data,cmap,vmin,vmax,legend in layers:
  tiff(name+'.tif',data);overlays.append(overlay(name,data,cmap,vmin,vmax,legend))
 dump('overlays.json',overlays)
 for filename,pool in [('nearby_candidates','nearby'),('candidates','wilderness_context')]:
  selected=[c for c in candidates if c['pool']==pool]
  dump(filename+'.json',selected)
  dump(filename+'.geojson',{'type':'FeatureCollection','features':[{'type':'Feature','geometry':{'type':'Point','coordinates':[c['longitude'],c['latitude']]},'properties':c} for c in selected]})
 dump('model_summary.json',{'grid_resolution_m':RES,'grid_crs':CRS,'canopy_mapped_year':2025,'cells_inside_wilderness':int(inside.sum()),'canopy_coverage_percent':round(float((inside&np.isfinite(canopy)).sum()/inside.sum()*100),2),'qualifying_cells':int(valid.sum()),'nearby_qualifying_cells':int((valid&(origin_distance<=3*1609.344)).sum()),'candidate_count':len(candidates),'nearby_candidate_count':ranks['nearby'],'wilderness_context_candidate_count':ranks['wilderness_context'],'input_counts':{'trails':len(trails),'roads':len(roads),'developed_campgrounds':len(camps),'streams':len(streams),'lakes':len(lakes),'springs_unknown_regime':len(springs),'perennial_water_features':len(perennial)},'critical_limits':['Water classifications do not guarantee 2027 flow','Campsite data represents developed mapped sites only; dispersed camps not modeled','Distance-to-access does not estimate actual recreation/hunting pressure','Security is a terrain proxy, not known elk ingress/egress','No candidate route, camera permission, firearm safety or harvest probability verified']})
 print(json.dumps({'candidate_count':len(candidates),'qualifying_cells':int(valid.sum()),'canopy_coverage_percent':round(float((inside&np.isfinite(canopy)).sum()/inside.sum()*100),2),'overlays':len(overlays)},indent=2))
if __name__=='__main__':main()
