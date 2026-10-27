import type { Manifest, RasterLegend } from '../atlas/schemas.ts'
import { MINOR_CONTOUR_MIN_ZOOM } from '../map/layerStyles.ts'
import { layerLabel } from './LayerControls.tsx'
import { LAYERS, type LayerDefinition, type LayerState } from './layerState.ts'

interface LegendProps {
  manifest: Manifest
  state: LayerState
  zoom: number | null
  onClose(): void
  className?: string
}

/** Lists what's on the map now: each drawn layer, then the candidate markers. */
export function Legend({ manifest, state, zoom, onClose, className = '' }: LegendProps) {
  const shown = LAYERS.filter(({ key }) => {
    const entry = state.layers[key]
    return entry?.on && entry.status.kind === 'ready'
  })

  return (
    <section
      id="map-legend"
      aria-labelledby="map-legend-heading"
      className={`absolute bottom-[55px] left-[23px] z-[500] max-h-[calc(100%-160px)] max-w-[250px] min-w-[180px] overflow-y-auto rounded-[7px] border border-[#d6ded1] bg-sheet/95 px-3.5 py-[13px] shadow-panel max-desktop:left-[15px] max-tablet:left-3 max-tablet:max-w-[220px] ${className}`}
    >
      <div className="mb-[9px] flex items-center justify-between gap-6">
        <h2 id="map-legend-heading" className="text-[8px] font-extrabold tracking-[.13em] text-[#5f7059]">
          ON THE MAP
        </h2>
        <button type="button" onClick={onClose} aria-label="Hide legend" className="px-1 text-[17px] leading-none text-[#7c8873]">
          ×
        </button>
      </div>
      <ul className="text-[10px] text-[#53674f]">
        {shown.map((definition) => (
          <LegendEntry key={definition.key} definition={definition} manifest={manifest} zoom={zoom} />
        ))}
        <li className="my-1.5 flex items-center gap-[9px]">
          <span aria-hidden="true" className="mx-1 size-3 flex-none rounded-full border-2 border-[#fff8e9] bg-marker shadow-[0_0_0_1px_var(--color-marker-ring)]" />
          Nearby candidate
        </li>
        <li className="my-1.5 flex items-center gap-[9px]">
          <span aria-hidden="true" className="mx-1 size-3 flex-none rounded-full border-2 border-sheet bg-marker-context shadow-[0_0_0_1px_#c9bf9f]" />
          Wilderness context candidate
        </li>
      </ul>
    </section>
  )
}

function LegendEntry({ definition, manifest, zoom }: { definition: LayerDefinition; manifest: Manifest; zoom: number | null }) {
  const { key, swatch, point } = definition
  const label = layerLabel(definition, manifest)
  const layer = manifest.layers[key]
  const ramp = layer?.type === 'raster' && layer.legend ? rampOf(key, layer.legend) : null

  if (ramp) {
    return (
      <li data-legend={key} className="my-2.5">
        <span className="font-semibold">{label}</span>
        <div aria-hidden="true" className="mt-2 mb-[3px] h-1.5 rounded-[3px]" style={{ background: `linear-gradient(90deg, ${ramp.colors.join(', ')})` }} />
        <div className="flex justify-between text-[9px] text-[#647760]">
          <span>{ramp.min}</span>
          <span>{ramp.max}</span>
        </div>
      </li>
    )
  }

  return (
    <li data-legend={key} className="my-1.5">
      <div className="flex items-center gap-[9px]">
        <span
          aria-hidden="true"
          style={{ background: swatch }}
          className={point ? 'mx-1.5 size-2 flex-none rounded-full' : 'h-[3px] w-5 flex-none rounded-[1px]'}
        />
        {label}
      </div>
      {key === 'contours' && <ContourNote zoom={zoom} />}
    </li>
  )
}

/** Says when the 40 ft lines are hidden, so a sparse contour layer doesn't look broken. */
function ContourNote({ zoom }: { zoom: number | null }) {
  const minorShown = zoom !== null && zoom >= MINOR_CONTOUR_MIN_ZOOM
  return (
    <p data-testid="contour-zoom-note" className="mt-1 ml-[29px] max-w-[200px] text-[9px] text-[#6d7a66]">
      {minorShown
        ? 'Every 40 ft, with heavier lines every 200 ft.'
        : 'Only the 200 ft lines show at this zoom. Zoom in to see every 40 ft contour.'}
    </p>
  )
}

interface Ramp {
  readonly colors: readonly string[]
  readonly min: string
  readonly max: string
}

/** The ramp's colours and end labels, in the layer's own units. */
function rampOf(key: string, legend: RasterLegend): Ramp {
  const [colors, min, max] =
    'gradient' in legend
      ? [legend.gradient.split(','), legend.min, legend.max]
      : [legend.map(({ color }) => color), legend[0]!.value, legend[legend.length - 1]!.value]
  const number = (value: number) => value.toLocaleString('en-US')
  if (key === 'canopy') return { colors, min: `${number(min)}%`, max: `${number(max)}%` }
  // The darkness raster saturates at its maximum distance.
  if (key === 'darkness') return { colors, min: `${number(min)} m`, max: `${number(max)}+ m` }
  return { colors, min: `${number(min)} · lower`, max: `${number(max)} · higher` }
}
