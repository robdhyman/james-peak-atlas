# Historical preprocessing references

These two files are copies of the scripts retained in the original published Site source commit. `build_model.py` is unchanged. In `bundle_data.py`, the hard-coded observation tuples and the CalTopo map URL are redacted for public release (ADR 0001); everything else is exact. They document the calculation and assembly logic; they are **not commands required to run this web app**.

- `build_model.py`: raster alignment, four component scores, admission masks, spatial separation and candidate selection.
- `bundle_data.py`: combines display assets, aliases candidate fields, adds observations, builds the runtime manifest and assigns nearby scouting order.

Both scripts refer to an earlier research workspace and are not portable as-is. The raw GIS inputs and original acquisition/preprocessing code were not preserved in the Site checkout. In particular, the scripts need DEM, slope and canopy TIFFs, normalized water and ownership files, and observation-reconciliation inputs that are not all in this ZIP. Scientific Python dependencies include NumPy, SciPy, Rasterio, Shapely, PyProj, Pillow and Matplotlib; the original versions are not recorded as a reproducible lockfile.

The runtime bundle is complete independently of these files. See the reproducibility boundary in [`reference/README.md`](../../reference/README.md) before attempting to rerun the analysis. A regenerated model should receive a new data/model version and be checked against its newly acquired inputs.
