// What a mapped feature's popup says: its name, the reference atlas's
// metadata line, and the caution that keeps the map honest about what a
// line or a point can't establish. Ported from `featurePopup` in
// reference/public/app.js. The adapter renders it as text, never as HTML.

/** The layers whose features open a popup. Contours, ownership and the wilderness boundary stay silent. */
export const POPUP_LAYERS: ReadonlySet<string> = new Set(['trails', 'roads', 'water', 'trailheads', 'campgrounds', 'gmu_boundaries'])

export interface FeaturePopup {
  readonly title: string
  /** Property values joined with ` · `; empty when the feature has none. */
  readonly meta: string
  /** Cautions, one per line. */
  readonly notes: readonly string[]
}

type Properties = Readonly<Record<string, unknown>> | null | undefined

/** The popup for a feature on `key`, or `null` for a layer that opens none. `layerLabel` names a feature that has no name. */
export function featurePopup(key: string, properties: Properties, layerLabel: string): FeaturePopup | null {
  if (!POPUP_LAYERS.has(key)) return null
  const p = properties ?? {}
  const title = text(p['name']) || layerLabel
  return { title, meta: metaLine(key, p).filter(Boolean).join(' · '), notes: notes(key, p) }
}

function metaLine(key: string, p: Readonly<Record<string, unknown>>): string[] {
  switch (key) {
    case 'trails':
    case 'roads':
      return [text(p['surface']), text(p['access']), text(p['type'])]
    case 'water':
      return [text(p['water_regime']), text(p['type'])]
    case 'gmu_boundaries': {
      const gmu = text(p['gmu'])
      return [gmu && `GMU ${gmu}`]
    }
    default:
      return []
  }
}

function notes(key: string, p: Readonly<Record<string, unknown>>): string[] {
  switch (key) {
    case 'water':
      return ['Mapped feature; 2027 flow not verified.']
    case 'roads':
      return ['Road geometry does not establish vehicle access.']
    case 'trailheads':
      return [text(p['vehicle_note']) || text(p['vehicle_screen']) || 'Vehicle approach unverified.']
    case 'campgrounds':
      return [`Inventory status: ${text(p['status_snapshot']) || 'Unknown'}`, text(p['status_note']) || 'Not a 2027 opening forecast.']
    default:
      return []
  }
}

/** A property as display text: strings and finite numbers only, with the bundle's `snake_case` codes spaced out. */
function text(value: unknown): string {
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''
  return typeof value === 'string' ? value.trim().replaceAll('_', ' ') : ''
}
