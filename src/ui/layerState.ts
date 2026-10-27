// Which layers are on, how strong the evidence overlays are, and whether
// each layer is loading, ready or failed. One reducer at the atlas root owns it.

export type LayerGroup = 'ground' | 'habitat' | 'scores'

export interface LayerDefinition {
  /** The manifest's layer key. */
  readonly key: string
  readonly group: LayerGroup
  /** Replaces the manifest's label where the atlas needs different words. */
  readonly label?: string
  /** The control and legend colour. */
  readonly swatch: string
  /** Drawn as point markers rather than lines or areas. */
  readonly point?: boolean
}

/** Every layer control, in display order. Colours are the reference atlas's. */
export const LAYERS: readonly LayerDefinition[] = [
  { key: 'trails', group: 'ground', swatch: '#9a6035' },
  { key: 'roads', group: 'ground', swatch: '#676a60' },
  { key: 'campgrounds', group: 'ground', swatch: '#7a7160', point: true },
  { key: 'trailheads', group: 'ground', swatch: '#355447', point: true },
  { key: 'boundary', group: 'ground', swatch: '#375f44' },
  { key: 'ownership', group: 'ground', swatch: '#849d61' },
  { key: 'gmu_boundaries', group: 'ground', swatch: '#946b89' },
  { key: 'official_topo', group: 'habitat', swatch: '#c7bb97' },
  { key: 'contours', group: 'habitat', swatch: '#a28a62' },
  { key: 'hillshade', group: 'habitat', swatch: '#b1b49b' },
  { key: 'canopy', group: 'habitat', swatch: '#477b45' },
  { key: 'water', group: 'habitat', swatch: '#438ba0' },
  { key: 'water_score', group: 'habitat', label: 'Low-water suitability', swatch: '#3d8fa4' },
  // One darkness layer, in metres. The manifest's `darkness_score` is the
  // same image under a 0–100 name, so it has no control.
  { key: 'darkness', group: 'habitat', label: 'Darkness: distance from access (0–2,000 m)', swatch: '#5c518a' },
  { key: 'overall_score', group: 'scores', swatch: '#be9441' },
  { key: 'shelter_score', group: 'scores', swatch: '#5d8751' },
  { key: 'security_score', group: 'scores', swatch: '#aa764d' },
]

export type PresetKey = 'terrain' | 'water' | 'quiet'

export const PRESETS: readonly { readonly key: PresetKey; readonly label: string }[] = [
  { key: 'terrain', label: 'Terrain' },
  { key: 'water', label: 'Low water' },
  { key: 'quiet', label: 'Quiet cover' },
]

// The reference atlas's preset layer sets, unchanged. A preset only switches
// layers; it never touches scores or candidates.
const PRESET_BASE = ['hillshade', 'boundary', 'trails', 'roads', 'water', 'trailheads']
const PRESET_EXTRAS: Record<PresetKey, readonly string[]> = {
  terrain: ['contours'],
  water: ['contours', 'water_score'],
  quiet: ['canopy', 'darkness'],
}

export function presetLayers(preset: PresetKey): ReadonlySet<string> {
  return new Set([...PRESET_BASE, ...PRESET_EXTRAS[preset]])
}

export type LayerStatus =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready' }
  | { readonly kind: 'failed'; readonly reason: string }

export interface LayerEntry {
  readonly on: boolean
  readonly status: LayerStatus
  /** Counts load attempts; a result from an earlier attempt is ignored. */
  readonly attempt: number
}

export interface LayerState {
  readonly layers: Readonly<Record<string, LayerEntry>>
  /** Overlay strength, as a percentage. */
  readonly opacity: number
  /** The preset whose layer set is showing, until a control changes it. */
  readonly preset: PresetKey | null
}

export type LayerAction =
  | { readonly type: 'toggle'; readonly key: string; readonly on: boolean }
  | { readonly type: 'preset'; readonly preset: PresetKey }
  | { readonly type: 'retry'; readonly key: string }
  | { readonly type: 'loaded'; readonly key: string; readonly attempt: number }
  | { readonly type: 'failed'; readonly key: string; readonly attempt: number; readonly reason: string }
  | { readonly type: 'opacity'; readonly value: number }

export const OPACITY_RANGE = { min: 10, max: 100, initial: 65 } as const

const IDLE: LayerEntry = { on: false, status: { kind: 'idle' }, attempt: 0 }

/** The atlas opens on the Terrain preset, as the reference atlas does. */
export function initialLayerState(): LayerState {
  const empty: LayerState = {
    layers: Object.fromEntries(LAYERS.map(({ key }) => [key, IDLE])),
    opacity: OPACITY_RANGE.initial,
    preset: null,
  }
  return layerReducer(empty, { type: 'preset', preset: 'terrain' })
}

export function layerReducer(state: LayerState, action: LayerAction): LayerState {
  switch (action.type) {
    case 'toggle':
      return { ...withLayers(state, { [action.key]: action.on }), preset: null }
    case 'preset': {
      const on = presetLayers(action.preset)
      return { ...withLayers(state, Object.fromEntries(LAYERS.map(({ key }) => [key, on.has(key)]))), preset: action.preset }
    }
    case 'retry':
      return withLayers(state, { [action.key]: true })
    case 'loaded':
      return update(state, action.key, action.attempt, (entry) =>
        entry.status.kind === 'loading' ? { ...entry, status: { kind: 'ready' } } : entry,
      )
    case 'failed':
      // A failed layer can't be on: its control unchecks and shows why.
      return update(state, action.key, action.attempt, (entry) => ({
        ...entry,
        on: false,
        status: { kind: 'failed', reason: action.reason },
      }))
    case 'opacity':
      return { ...state, opacity: Math.min(OPACITY_RANGE.max, Math.max(OPACITY_RANGE.min, action.value)) }
  }
}

/** Switches layers on or off. Switching on a layer that isn't loaded or loading starts a new attempt. */
function withLayers(state: LayerState, changes: Readonly<Record<string, boolean>>): LayerState {
  const layers = { ...state.layers }
  for (const [key, on] of Object.entries(changes)) {
    const entry = layers[key] ?? IDLE
    const reload = on && (entry.status.kind === 'idle' || entry.status.kind === 'failed')
    layers[key] = reload ? { on, status: { kind: 'loading' }, attempt: entry.attempt + 1 } : { ...entry, on }
  }
  return { ...state, layers }
}

/** Applies a load result, unless it belongs to an earlier attempt. */
function update(state: LayerState, key: string, attempt: number, change: (entry: LayerEntry) => LayerEntry): LayerState {
  const entry = state.layers[key]
  if (!entry || entry.attempt !== attempt) return state
  return { ...state, layers: { ...state.layers, [key]: change(entry) } }
}
