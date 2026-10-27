// Display wording shared by the candidate list and the detail panel.
import type { Pool } from '../atlas/schemas.ts'

export const POOL_LABELS: Record<Pool, string> = {
  nearby: 'Nearby',
  wilderness_context: 'Wilderness context',
}

/** "72 / 100": a relative index, never a percentage or a probability. */
export function formatScoutingIndex(score: number): string {
  return `${Math.round(score)} / 100`
}

/** "Nearby #2": the place by scouting index within the pool, never the list position. */
export function formatPoolRank(pool: Pool, rank: number): string {
  return `${POOL_LABELS[pool]} #${rank}`
}

export function formatMiles(miles: number): string {
  return `${miles.toFixed(1)} mi`
}

export function formatMetres(metres: number): string {
  return metres >= 1000 ? `${(metres / 1000).toFixed(2)} km` : `${Math.round(metres)} m`
}

/** Where a candidate stands against the origin's distance budget, as its card and detail say it. */
export function routeNote(pool: Pool, budgetMiles: number): string {
  return pool === 'nearby'
    ? 'Straight-line lower bound · route unverified'
    : `Minimum round trip over ${budgetMiles} mi · context only`
}
