import { type ReactNode, useEffect, useState } from 'react'
import { type CanopySample, type LatLng, sampleCanopy } from '../atlas/canopy.ts'
import { type CanopyGrid, type DataSource, loadCanopyGrid } from '../atlas/data.ts'
import type { Manifest } from '../atlas/schemas.ts'

type GridLoad = { status: 'loading' } | { status: 'failed' } | { status: 'ready'; grid: CanopyGrid }

/** "Canopy 31%", and never 0% or 255% for a missing pixel. */
export function formatCanopy(sample: CanopySample): string {
  return sample.kind === 'cover' ? `Canopy ${sample.percent}%` : 'Canopy: No data'
}

/**
 * The canopy inspector's readout for the point under the pointer or the last
 * tap. It loads the display grid itself, so it doesn't wait on layer state,
 * and shows nothing while there's no point or the point is off the grid.
 */
export function CanopyReadout({ source, manifest, point }: { source: DataSource; manifest: Manifest; point: LatLng | null }) {
  const [load, setLoad] = useState<GridLoad>({ status: 'loading' })

  useEffect(() => {
    let active = true
    loadCanopyGrid(source, manifest).then((result) => {
      if (active) setLoad(result.ok ? { status: 'ready', grid: result.value } : { status: 'failed' })
    })
    return () => {
      active = false
    }
  }, [source, manifest])

  if (!point || load.status === 'loading') return null
  if (load.status === 'failed') {
    return (
      <Panel>
        <p className="text-[11px] text-alert-text">Canopy readout unavailable: the canopy grid couldn’t be loaded.</p>
      </Panel>
    )
  }
  const sample = sampleCanopy(load.grid, point)
  if (!sample) return null

  return (
    <Panel>
      <p data-testid="canopy-value" className="flex-none text-[13px] font-semibold">
        {formatCanopy(sample)}
      </p>
      <p className="text-[10px] leading-[1.35] text-muted">
        Reads the ~30 m display grid; a candidate’s modelled canopy can differ.
      </p>
    </Panel>
  )
}

/**
 * At the candidate card's width, in the map's top-right row beside the Legend
 * button. Below 1100 px the note wraps to three lines, so it rises 8 px to
 * clear the card. On phones it fills the row.
 */
function Panel({ children }: { children: ReactNode }) {
  return (
    <section
      aria-label="Canopy readout"
      className="pointer-events-none flex w-[330px] min-w-0 items-center gap-3 rounded-[7px] border border-line-strong bg-sheet/95 px-3 py-2 shadow-panel max-desktop:-mt-2 max-desktop:w-[305px] max-tablet:mt-0 max-tablet:w-auto max-tablet:flex-1 wide:w-[350px]"
    >
      {children}
    </section>
  )
}
