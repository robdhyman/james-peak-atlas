import type { Dispatch, ReactNode } from 'react'
import type { Manifest } from '../atlas/schemas.ts'
import {
  LAYERS,
  OPACITY_RANGE,
  PRESETS,
  type LayerAction,
  type LayerDefinition,
  type LayerGroup,
  type LayerState,
} from './layerState.ts'

interface LayerControlsProps {
  manifest: Manifest
  state: LayerState
  dispatch: Dispatch<LayerAction>
}

/** The control's name: the atlas's own wording where it has one, else the manifest's label. */
export function layerLabel(definition: LayerDefinition, manifest: Manifest): string {
  return definition.label ?? manifest.layers[definition.key]?.label ?? definition.key
}

/** Presets, a switch per layer with its loading state, and overlay strength. */
export function LayerControls({ manifest, state, dispatch }: LayerControlsProps) {
  const rows = (group: LayerGroup) =>
    LAYERS.filter((definition) => definition.group === group).map((definition) => (
      <LayerRow
        key={definition.key}
        definition={definition}
        compact={group === 'scores'}
        manifest={manifest}
        state={state}
        dispatch={dispatch}
      />
    ))

  return (
    <>
      <div role="group" aria-label="Map presets" className="mb-6 flex gap-0.5 rounded-[6px] border border-line bg-[#edefe8] p-[3px]">
        {PRESETS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            aria-pressed={state.preset === key}
            onClick={() => dispatch({ type: 'preset', preset: key })}
            className="flex-1 rounded-[3px] px-0.5 py-1.5 text-[10px] text-ink-soft aria-pressed:bg-white aria-pressed:font-bold aria-pressed:text-ink aria-pressed:shadow-[0_1px_3px_#173b3510]"
          >
            {label}
          </button>
        ))}
      </div>

      <LayerSection title="Ground & access" number="01">
        {rows('ground')}
      </LayerSection>

      <LayerSection title="Habitat evidence" number="02">
        {rows('habitat')}
        <li className="mt-2.5 ml-[7px] border-l border-[#d9dfd2] pl-[13px]">
          <h3 className="pt-1 text-[11px] font-bold">Model scores · 0–100</h3>
          <p className="mt-0.5 mb-1 text-[10px] leading-[1.45] text-muted">
            Relative indices from the scouting model, not probabilities.
          </p>
          <ul>{rows('scores')}</ul>
        </li>
      </LayerSection>

      <div className="border-t border-line pt-4">
        <label htmlFor="overlay-strength" className="mb-2 flex justify-between text-[11px] text-ink-soft">
          Overlay strength
          <output htmlFor="overlay-strength" className="text-muted tabular-nums">
            {state.opacity}%
          </output>
        </label>
        <input
          id="overlay-strength"
          type="range"
          min={OPACITY_RANGE.min}
          max={OPACITY_RANGE.max}
          value={state.opacity}
          onChange={(event) => dispatch({ type: 'opacity', value: Number(event.target.value) })}
          aria-describedby="overlay-strength-note"
          className="h-[3px] w-full cursor-pointer accent-ink"
        />
        <p id="overlay-strength-note" className="mt-2 text-[10px] text-muted">
          Applies to canopy, darkness and the model score layers.
        </p>
      </div>

      <div className="mt-6 rounded-[5px] border-l-2 border-[#a6b69e] bg-[#eeefe5] px-3.5 py-[13px]">
        <span className="text-[8px] font-extrabold tracking-[.09em] text-[#5f7154]">LOW-WATER SCENARIO</span>
        <p className="mt-[7px] text-[10px] leading-[1.65] text-[#5f6d57]">
          Mapped perennial water and lakes receive more weight. A blue line is a place to verify water—not a promise
          it will flow.
        </p>
      </div>
    </>
  )
}

function LayerSection({ title, number, children }: { title: string; number: string; children: ReactNode }) {
  return (
    <div role="group" aria-labelledby={`layers-${number}`} className="mb-[23px]">
      <div className="mb-[9px] flex items-center justify-between">
        <h2 id={`layers-${number}`} className="text-[11px] font-bold tracking-[.02em]">
          {title}
        </h2>
        <span aria-hidden="true" className="text-[9px] text-[#646e65]">
          {number}
        </span>
      </div>
      <ul>{children}</ul>
    </div>
  )
}

function LayerRow({
  definition,
  compact,
  manifest,
  state,
  dispatch,
}: LayerControlsProps & { definition: LayerDefinition; compact: boolean }) {
  const { key, swatch, point } = definition
  const entry = state.layers[key]
  if (!entry) return null
  const label = layerLabel(definition, manifest)
  const { status } = entry
  const id = `layer-${key}`

  return (
    <li data-layer={key}>
      <div className={`flex items-center gap-[9px] py-[5px] ${compact ? 'min-h-[29px]' : 'min-h-[34px]'}`}>
        <input
          id={id}
          type="checkbox"
          checked={entry.on}
          onChange={(event) => dispatch({ type: 'toggle', key, on: event.target.checked })}
          aria-describedby={status.kind === 'loading' || status.kind === 'failed' ? `${id}-status` : undefined}
          className="layer-checkbox"
        />
        <label
          htmlFor={id}
          title={manifest.layers[key]?.description}
          className={`flex flex-1 cursor-pointer items-center gap-[9px] leading-[1.3] ${compact ? 'text-[11px]' : 'text-[12px]'}`}
        >
          <span
            aria-hidden="true"
            style={{ background: swatch }}
            className={point ? 'mx-1 size-2 flex-none rounded-full' : 'h-1 w-4 flex-none rounded-[3px]'}
          />
          {label}
        </label>
        {status.kind === 'loading' && (
          <span id={`${id}-status`} className="flex items-center gap-1 text-[9px] text-muted">
            <span aria-hidden="true" className="size-2.5 animate-spin rounded-full border border-line-strong border-t-ink" />
            Loading
          </span>
        )}
      </div>
      {/* The switch is described by this message; the app's own status region announces the failure. */}
      {status.kind === 'failed' && (
        <div data-testid="layer-failure" className="mb-1.5 ml-6 flex items-start gap-2 rounded-[4px] border border-alert-line bg-alert px-2.5 py-1.5 text-[10px] text-alert-text">
          <p id={`${id}-status`} className="flex-1 [overflow-wrap:anywhere]">
            Couldn’t load: {status.reason}
          </p>
          <button
            type="button"
            onClick={() => dispatch({ type: 'retry', key })}
            aria-label={`Retry ${label}`}
            className="flex-none rounded-[3px] border border-alert-line bg-sheet px-2 py-0.5 font-bold text-ink"
          >
            Retry
          </button>
        </div>
      )}
    </li>
  )
}
