# James Peak Scouting Atlas

A map-based planning tool for picking elk scouting locations in Colorado's James Peak Wilderness. It sets modelled hypotheses next to the terrain, canopy, water and access evidence behind them.

## Places

**Candidate**:
A place to scout chosen by the model, with an `EP-*` or `JP-*` ID. It's a hypothesis to verify in the field, not evidence of elk.
_Avoid_: spot, pin, perfect spot, location

**Observation**:
A field sighting the atlas owner recorded first-hand. It's evidence, not a model output, and is never shown publicly.
_Avoid_: anchor, your location

**Origin**:
The point where access on foot begins: the Moffat Tunnel / East Portal parking lot.
_Avoid_: trailhead (a separate class of mapped feature), start

## Ranking

**Pool**:
One of the two disjoint sets candidates are selected into: **Nearby** (within the origin's distance budget) or **Wilderness context** (high-scoring places elsewhere in the wilderness).
_Avoid_: group, tier

**Scouting index**:
The relative 0–100 weighted sum of the water, shelter, darkness and security components. It is not a probability.
_Avoid_: probability, odds, percent, rating

**Pool rank**:
A candidate's position by scouting index within its own pool.
_Avoid_: rank (unqualified), overall rank

**Scout order**:
The practical order for visiting Nearby candidates, shortest minimum round trip first.
_Avoid_: priority, rank

**Scope**:
Which candidates the list shows: **Nearby** (exactly the Nearby pool) or **All** (both pools).
_Avoid_: filter, near (as a computed distance test)

## Field work

**Field log**:
The atlas owner's own per-candidate record of field status and notes, kept apart from the model's data.
_Avoid_: recon list, scouting log, log (unqualified)

**Field status**:
Where a candidate stands in the owner's field work: To scout, Scouted, Camera placed or Ruled out.
_Avoid_: status (unqualified; candidate data has its own unrelated `status`), recon status

## Distance

**Minimum round trip**:
Twice the straight-line distance from the origin to a candidate. A lower bound, not a walkable distance.
_Avoid_: route, hike distance, mileage
