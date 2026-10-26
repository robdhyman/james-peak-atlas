/* Numeric inspection of the same locally bundled 2025 canopy raster. */
(() => {
  async function attach(map) {
    try {
      const response = await fetch('data/canopy_grid.json');
      if (!response.ok) return;
      const grid = await response.json();
      const pixels = Uint8Array.from(atob(grid.data_base64), c => c.charCodeAt(0));
      const readout = L.control({ position: 'topright' });
      let label;
      readout.onAdd = () => {
        label = L.DomUtil.create('div', 'canopy-readout');
        label.style.cssText = 'background:#fffdf5eF;border:1px solid #c8d1c0;border-radius:7px;padding:7px 10px;font:11px system-ui;color:#244638;box-shadow:0 1px 5px #0001;pointer-events:none;margin-top:65px;';
        label.textContent = `Canopy ${grid.year} · move over map to inspect`;
        return label;
      };
      readout.addTo(map);
      function sample(latlng) {
        const xy = L.CRS.EPSG3857.project(latlng), [west,south,east,north] = grid.bounds;
        const col = Math.floor((xy.x-west)/(east-west)*grid.width);
        const row = Math.floor((north-xy.y)/(north-south)*grid.height);
        const value = col>=0&&row>=0&&col<grid.width&&row<grid.height ? pixels[row*grid.width+col] : grid.nodata;
        label.textContent = value === grid.nodata || value > 100 ? `Canopy ${grid.year} · no data here` : `Canopy ${grid.year} · ${value}% cover`;
      }
      map.on('mousemove', e => sample(e.latlng));
      map.on('click', e => sample(e.latlng));
    } catch (_) { /* Raster remains available if optional numeric inspection fails. */ }
  }
  if (window.atlasMap) attach(window.atlasMap);
  else window.addEventListener('atlasready', event => attach(event.detail?.map || window.atlasMap), {once:true});
})();
