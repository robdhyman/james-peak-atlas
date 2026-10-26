# 05: Canopy inspector

**What to build:** A numeric canopy readout. It appears on hover with a pointer and on tap with touch, shows "No data" where data is missing, and says it reads the display grid.

**Blocked by:** 03 (Data to map)

**Status:** ready-for-agent

- [ ] The canopy grid decodes as row-major bytes with row zero at the north edge, sampled at the projected position under the pointer. This is a pure function with Vitest tests at known pixels, including a NoData pixel and a valid 0%.
- [ ] Hovering shows "Canopy N%". Tapping on a touch device shows the same readout at the tapped point.
- [ ] A 255 value shows "No data", never 0% or 255%. Points outside the grid show nothing.
- [ ] The readout notes that it reads the ~30 m display grid, which can differ from a candidate's modelled canopy.
- [ ] Playwright: hovering a known point shows the expected value, and the touch emulation path shows the readout.
