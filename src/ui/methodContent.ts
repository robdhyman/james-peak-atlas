// The Method and sources dialog's content, derived from the bundled method
// specification and manifest. Labels name the data's keys; every number,
// formula and description comes from the data itself.
import type { Atlas } from '../atlas/data.ts'
import { COMPONENTS, type ComponentKey } from '../atlas/schemas.ts'

export const COMPONENT_LABELS: Record<ComponentKey, string> = {
  water: 'Water',
  shelter: 'Shelter',
  darkness: 'Darkness',
  security: 'Security',
}

export interface MethodComponent {
  readonly key: ComponentKey
  readonly label: string
  /** The weight as a whole percentage, e.g. 35. */
  readonly percent: number
  readonly weight: number
  readonly meaning: string
  readonly formula: string
  readonly description: string
}

export interface Threshold {
  readonly key: string
  readonly text: string
}

export interface CitedSource {
  readonly name: string
  readonly url: string
  readonly vintage: string
  readonly note: string
}

export interface MethodContent {
  readonly planningYear: number
  readonly scenario: string
  readonly occupancy: string
  readonly components: readonly MethodComponent[]
  /** "0.35 × water + 0.25 × shelter + …" */
  readonly indexFormula: string
  readonly thresholds: readonly Threshold[]
  readonly pools: { readonly nearby: string; readonly context: string; readonly budget: string }
  readonly limitations: readonly string[]
  readonly vintages: readonly { readonly label: string; readonly text: string }[]
  readonly fieldChecks: readonly string[]
  readonly sources: readonly CitedSource[]
}

/**
 * Selection keys that aren't shown. The known-anchor radius is the exclusion
 * zone around the owner's observations, which the public atlas never hints
 * at (ADR 0001). The others are prose, shown in their own sections.
 */
const NOT_THRESHOLDS = new Set([
  'exclude_known_anchor_radius_m',
  'nearby_pool',
  'wilderness_context_pool',
  'exact_geometry_rechecks',
  'routes_not_verified',
  'min_distance_to_perennial_water_m',
  'max_distance_to_perennial_water_m',
])

/** Wording for the selection keys the bundle uses. Values are filled from the data. */
const THRESHOLD_TEXT: Record<string, (value: number) => string> = {
  min_candidate_canopy_percent: (v) => `Canopy cover at least ${v}%`,
  max_candidate_slope_degrees: (v) => `Slope at most ${v}°`,
  min_distance_to_mapped_access_m: (v) => `At least ${v} m from mapped access`,
  min_water_score: (v) => `Water component at least ${v}`,
  min_security_score: (v) => `Security component at least ${v}`,
  min_separation_m: (v) => `Candidates at least ${v} m apart`,
}

/** Wording for the selection rules that apply when `true`. */
const RULE_TEXT: Record<string, string> = {
  require_inside_actual_wilderness: 'Inside the wilderness boundary',
  require_mapped_usfs_fee_ownership: 'On mapped USFS fee land',
  exclude_mapped_lake_polygons: 'Not inside a mapped lake',
}

export function methodContent({ method, manifest }: Atlas): MethodContent {
  const components = COMPONENTS.map((key): MethodComponent => {
    const { weight, meaning, formula, description } = method.components[key]
    return { key, label: COMPONENT_LABELS[key], percent: Math.round(weight * 100), weight, meaning, formula, description }
  })
  const { selection } = method

  return {
    planningYear: method.planning_year,
    scenario: method.scenario,
    occupancy: method.occupancy_assumption,
    components,
    indexFormula: components.map(({ key, weight }) => `${weight} × ${key}`).join(' + '),
    thresholds: [
      {
        key: 'perennial_water_m',
        text: `Perennial water ${selection.min_distance_to_perennial_water_m}–${selection.max_distance_to_perennial_water_m} m away`,
      },
      ...thresholds(selection),
    ],
    pools: {
      nearby: selection.nearby_pool,
      context: selection.wilderness_context_pool,
      budget: method.route_limits.reason,
    },
    limitations: [
      method.distance_uncertainty,
      ...(typeof selection['exact_geometry_rechecks'] === 'string' ? [selection['exact_geometry_rechecks']] : []),
    ],
    vintages: Object.entries(method.source_vintages).map(([key, text]) => ({ label: humanize(key), text })),
    fieldChecks: method.required_field_checks,
    sources: citedSources(manifest.sources),
  }
}

/** Only sources with an external link are cited; one without can't be checked. */
export function citedSources(sources: Atlas['manifest']['sources']): CitedSource[] {
  return sources.flatMap(({ name, url, vintage, note }) => (url ? [{ name, url, vintage, note }] : []))
}

/**
 * Every remaining numeric or `true` selection rule. A
 * key without wording is still shown, by its own name, so a new rule in the
 * data is never dropped silently.
 */
function thresholds(selection: Atlas['method']['selection']): Threshold[] {
  return Object.entries(selection).flatMap(([key, value]): Threshold[] => {
    if (NOT_THRESHOLDS.has(key)) return []
    if (typeof value === 'number') return [{ key, text: THRESHOLD_TEXT[key]?.(value) ?? `${humanize(key)}: ${value}` }]
    if (value === true) return [{ key, text: RULE_TEXT[key] ?? humanize(key) }]
    return []
  })
}

function humanize(key: string): string {
  const text = key.replaceAll('_', ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}
