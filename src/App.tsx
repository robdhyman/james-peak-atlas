import { useEffect, useMemo, useState } from 'react'
import type { LatLng } from './atlas/canopy.ts'
import { type Atlas, type DataError, type DataSource, formatDataError, loadAtlas, loadGeoJsonLayer, resolveUrl } from './atlas/data.ts'
import type { FeatureCollection } from './atlas/schemas.ts'
import type { MapLayer } from './map/mapAdapter.ts'
import { MapView } from './map/MapView.tsx'
import { CandidateCard } from './ui/CandidateCard.tsx'
import { CanopyReadout } from './ui/CanopyReadout.tsx'
import { FatalError } from './ui/FatalError.tsx'

type Load = { status: 'loading' } | { status: 'failed'; error: DataError } | { status: 'ready'; atlas: Atlas }

/** The raster drawn under everything else until layer controls arrive. */
const BASE_RASTER = 'hillshade'

export function App({ source }: { source: DataSource }) {
  const [load, setLoad] = useState<Load>({ status: 'loading' })

  useEffect(() => {
    let active = true
    loadAtlas(source).then((result) => {
      if (active) setLoad(result.ok ? { status: 'ready', atlas: result.value } : { status: 'failed', error: result.error })
    })
    return () => {
      active = false
    }
  }, [source])

  if (load.status === 'failed') return <FatalError error={load.error} />

  return (
    <div className="flex h-full flex-col">
      <Topbar />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside
          aria-label="Map controls"
          className="flex w-[326px] flex-none flex-col border-r border-line-strong bg-paper max-tablet:hidden max-desktop:w-[296px] wide:w-[346px]"
        >
          <div className="px-[23px] pt-6 pb-[19px] max-desktop:px-[19px] wide:px-7">
            <div className="text-[10px] font-bold tracking-[.11em] text-muted">JAMES PEAK WILDERNESS</div>
            <p className="mt-1.5 mb-[11px] text-[17px] font-semibold tracking-[-.03em]">
              Find the next place worth a walk.
            </p>
          </div>
        </aside>
        <main aria-label="Interactive scouting map" className="relative min-w-0 flex-1 bg-map">
          {load.status === 'loading' ? <MapLoading /> : <AtlasMap atlas={load.atlas} source={source} />}
        </main>
      </div>
    </div>
  )
}

function AtlasMap({ atlas, source }: { atlas: Atlas; source: DataSource }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [boundary, setBoundary] = useState<FeatureCollection | null>(null)
  const [layerError, setLayerError] = useState<DataError | null>(null)
  const [probe, setProbe] = useState<LatLng | null>(null)

  useEffect(() => {
    let active = true
    loadGeoJsonLayer(source, atlas.manifest, 'boundary').then((result) => {
      if (!active) return
      if (result.ok) setBoundary(result.value)
      else setLayerError(result.error)
    })
    return () => {
      active = false
    }
  }, [atlas, source])

  const layers = useMemo(() => {
    const raster = atlas.manifest.layers[BASE_RASTER]
    const next: MapLayer[] = []
    if (raster?.type === 'raster') {
      next.push({ key: BASE_RASTER, kind: 'raster', url: resolveUrl(source, raster.url), bounds: raster.bounds })
    }
    if (boundary) next.push({ key: 'boundary', kind: 'geojson', data: boundary })
    return next
  }, [atlas, source, boundary])

  const selected = atlas.candidates.find((candidate) => candidate.properties.id === selectedId)
  const notices = [...atlas.warnings, ...(layerError ? [layerError] : [])]

  return (
    <>
      <MapView
        extent={atlas.manifest.bounds}
        layers={layers}
        candidates={atlas.candidates}
        selectedId={selectedId}
        onCandidateClick={setSelectedId}
        onProbe={setProbe}
      />
      <CanopyReadout source={source} manifest={atlas.manifest} point={probe} />
      {notices.length > 0 && (
        <div
          role="status"
          className="absolute top-5 left-[23px] z-[600] max-w-[430px] rounded-[5px] border border-alert-line bg-alert px-3.5 py-2.5 text-[11px] text-alert-text shadow-panel max-tablet:inset-x-3 max-tablet:top-3"
        >
          {notices.map((notice) => (
            <p key={notice.file}>Couldn’t load {formatDataError(notice)}</p>
          ))}
        </div>
      )}
      {selected && <CandidateCard candidate={selected} onClose={() => setSelectedId(null)} />}
    </>
  )
}

function MapLoading() {
  return (
    <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-paper">
      <span aria-hidden="true" className="size-7 animate-spin rounded-full border-2 border-line-strong border-t-ink" />
      <strong className="font-display text-[23px] font-normal">Opening the atlas</strong>
      <span className="text-[11px] text-muted">Loading the bundled map data</span>
    </div>
  )
}

function Topbar() {
  return (
    <header className="relative z-[1100] flex h-[86px] flex-none items-center gap-6 bg-ink px-7 text-topbar-text max-desktop:gap-4 max-desktop:px-5 max-tablet:h-[72px] max-tablet:gap-[11px] max-tablet:px-[15px]">
      <div className="flex flex-none items-center gap-[13px]">
        <svg
          viewBox="0 0 40 34"
          aria-hidden="true"
          className="h-[39px] w-[42px] fill-none stroke-brand-mark stroke-[1.3] [stroke-linecap:round] [stroke-linejoin:round] max-tablet:hidden"
        >
          <path d="m2 29 13-23 8 13 5-8 10 18H2Z" />
          <path d="m10 15 5 4 4-5M23 19l5 4 4-4" />
        </svg>
        <div>
          <span className="text-[9px] font-bold tracking-[.19em] text-topbar-eyebrow">FIELD ATLAS / COLORADO</span>
          <h1 className="mt-0.5 font-display text-[30px] leading-[1.1] font-normal tracking-[-.025em] max-tablet:text-[25px]">
            James Peak
          </h1>
        </div>
      </div>
      <div className="ml-auto flex flex-col items-end gap-1.5">
        <span className="flex items-center gap-[7px] text-[10px] font-bold tracking-[.12em] text-scenario max-tablet:text-[8px] max-tablet:tracking-[.05em]">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-amber-dot" />
          LOW WATER · 2027
        </span>
        <span className="text-[11px] text-topbar-muted max-desktop:hidden">Occupancy assumed for planning</span>
      </div>
    </header>
  )
}
