import { type KeyboardEvent, type ReactNode, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { LatLng } from './atlas/canopy.ts'
import { type Atlas, type DataSource, formatDataError, loadAtlas, loadGeoJsonLayer, MANIFEST_URL, resolveUrl } from './atlas/data.ts'
import type { DataError } from './atlas/data.ts'
import type { FeatureCollection } from './atlas/schemas.ts'
import { decodeViewHash, encodeViewHash } from './candidates/viewLink.ts'
import { type ListView, visibleCandidates } from './candidates/visibleList.ts'
import type { MapLayer } from './map/mapAdapter.ts'
import { type MapHandle, MapView } from './map/MapView.tsx'
import { useFieldLog } from './fieldLog/useFieldLog.ts'
import { CandidateDetail } from './ui/CandidateDetail.tsx'
import { cardId, CandidateList, FIELD_STATUS_FILTER_ID } from './ui/CandidateList.tsx'
import { CanopyReadout } from './ui/CanopyReadout.tsx'
import { ExportMenu } from './ui/ExportMenu.tsx'
import { FatalError } from './ui/FatalError.tsx'
import { FieldLogNotices } from './ui/FieldLogNotices.tsx'
import { FieldLogTools } from './ui/FieldLogTools.tsx'
import { LayerControls, layerLabel } from './ui/LayerControls.tsx'
import { initialLayerState, LAYERS, layerReducer } from './ui/layerState.ts'
import { Legend } from './ui/Legend.tsx'
import { MethodDialog } from './ui/MethodDialog.tsx'
import { ObservationList } from './ui/ObservationList.tsx'

type Load = { status: 'loading' } | { status: 'failed'; error: DataError } | { status: 'ready'; atlas: Atlas }

/** `storage` keeps the field log; `null` when the browser's storage can't be reached. */
export function App({ source, storage }: { source: DataSource; storage: Storage | null }) {
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
  if (load.status === 'loading') {
    return (
      <Layout atlas={null} sidebar={null} exportMenu={<ExportMenu visible={null} log={{}} />}>
        <MapLoading />
      </Layout>
    )
  }
  return <AtlasView atlas={load.atlas} source={source} storage={storage} />
}

/** Where the open detail panel was opened from, so closing it can hand focus back. */
type Opener = 'list' | 'map'

/**
 * The loaded atlas. Its root owns the layer state (what's on, overlay
 * strength, and each layer's status), the list view, the selection and the
 * field log. The URL hash carries the selection, scope and sort, so a link
 * reopens them.
 */
function AtlasView({ atlas, source, storage }: { atlas: Atlas; source: DataSource; storage: Storage | null }) {
  const { manifest } = atlas
  const [layerState, dispatch] = useReducer(layerReducer, undefined, initialLayerState)
  const [vectors, setVectors] = useState<Readonly<Record<string, FeatureCollection>>>({})
  // The link this page was opened with; a broken one opens the default view with a notice.
  const [opened] = useState(() => decodeViewHash(window.location.hash, atlas.candidates))
  const [view, setView] = useState<ListView>({ scope: opened.view.scope, sort: opened.view.sort, search: '' })
  // A linked candidate counts as opened from the map, so closing its panel focuses its marker.
  const [selection, setSelection] = useState<{ id: string; opener: Opener } | null>(
    opened.view.candidate ? { id: opened.view.candidate, opener: 'map' } : null,
  )
  const [linkProblem, setLinkProblem] = useState(opened.problem)
  const fieldLog = useFieldLog(storage)
  const candidateIds = useMemo(() => new Set(atlas.candidates.map(({ properties }) => properties.id)), [atlas.candidates])
  const map = useRef<MapHandle>(null)
  const [zoom, setZoom] = useState<number | null>(null)
  const [probe, setProbe] = useState<LatLng | null>(null)
  const [legendOpen, setLegendOpen] = useState(true)
  // Only the private build has observations. With none, no observation UI renders at all (ADR 0001).
  const hasObservations = atlas.observations.length > 0
  // The attempt each layer last started fetching, so an attempt is fetched once.
  const requested = useRef(new Map<string, number>())

  // GeoJSON layers are fetched here when switched on. Rasters load as images
  // inside the map, which reports back through onLayerLoad and onLayerError.
  useEffect(() => {
    for (const [key, { status, attempt }] of Object.entries(layerState.layers)) {
      if (status.kind !== 'loading' || requested.current.get(key) === attempt) continue
      const layer = manifest.layers[key]
      if (layer?.type === 'raster') continue
      requested.current.set(key, attempt)
      if (!layer) {
        dispatch({ type: 'failed', key, attempt, reason: `not listed in ${MANIFEST_URL}` })
        continue
      }
      loadGeoJsonLayer(source, manifest, key).then((result) => {
        if (result.ok) {
          setVectors((current) => ({ ...current, [key]: result.value }))
          dispatch({ type: 'loaded', key, attempt })
        } else {
          dispatch({ type: 'failed', key, attempt, reason: formatDataError(result.error) })
        }
      })
    }
  }, [layerState.layers, manifest, source])

  const mapLayers = useMemo(
    () =>
      LAYERS.flatMap((definition): MapLayer[] => {
        const { key } = definition
        const entry = layerState.layers[key]
        const layer = manifest.layers[key]
        if (!entry?.on || !layer) return []
        if (layer.type === 'raster') {
          return [{ key, kind: 'raster', url: resolveUrl(source, layer.url), bounds: layer.bounds, revision: entry.attempt }]
        }
        const data = vectors[key]
        return data && entry.status.kind === 'ready' ? [{ key, kind: 'geojson', data, revision: entry.attempt, label: layerLabel(definition, manifest) }] : []
      }),
    [layerState.layers, manifest, source, vectors],
  )

  // The one visible list, for the cards and the markers alike.
  const visible = useMemo(() => visibleCandidates(atlas.candidates, view, fieldLog.log), [atlas.candidates, view, fieldLog.log])
  const markers = useMemo(() => visible.map(({ candidate }) => candidate), [visible])
  const pools = useMemo(() => new Set(visible.map(({ pool }) => pool)), [visible])

  // A candidate that leaves the visible list takes its detail panel with it,
  // except through the field-status filter: changing the open candidate's
  // field status mustn't close the panel it was changed in.
  const selectable = useMemo(() => visibleCandidates(atlas.candidates, { ...view, fieldStatus: null }), [atlas.candidates, view])
  const selected = selection ? selectable.find(({ candidate }) => candidate.properties.id === selection.id)?.candidate : undefined
  if (selection && !selected) setSelection(null)
  const selectedId = selected ? selected.properties.id : null

  // The view is the link. It's replaced, not pushed, so it adds no history
  // entries, and layer changes never touch it.
  const hash = encodeViewHash({ scope: view.scope, sort: view.sort, candidate: selectedId })
  useEffect(() => {
    if (window.location.hash === hash) return
    history.replaceState(history.state, '', hash || `${window.location.pathname}${window.location.search}`)
  }, [hash])

  // A linked candidate is revealed after the commit that puts its marker on
  // the map: the map's own effects run first, and a link can change the scope.
  const [linkReveal, setLinkReveal] = useState(opened.view.candidate ? { id: opened.view.candidate } : null)
  useEffect(() => {
    if (linkReveal) map.current?.reveal(linkReveal.id)
  }, [linkReveal])

  // Follow a link pasted into this tab.
  useEffect(() => {
    function followLink() {
      const link = decodeViewHash(window.location.hash, atlas.candidates)
      setView({ scope: link.view.scope, sort: link.view.sort, search: '' })
      setSelection(link.view.candidate ? { id: link.view.candidate, opener: 'map' } : null)
      setLinkProblem(link.problem)
      setLinkReveal(link.view.candidate ? { id: link.view.candidate } : null)
    }
    window.addEventListener('hashchange', followLink)
    return () => window.removeEventListener('hashchange', followLink)
  }, [atlas.candidates])

  function selectFromList(id: string) {
    setSelection({ id, opener: 'list' })
    map.current?.reveal(id)
  }

  function closeDetail() {
    if (!selection) return
    setSelection(null)
    if (!visible.some(({ candidate }) => candidate.properties.id === selection.id)) {
      // Filtered out by field status, so its card and marker are gone: focus the filter, or its tab when that's hidden.
      const filter = document.getElementById(FIELD_STATUS_FILTER_ID)
      filter?.focus()
      if (document.activeElement !== filter) document.getElementById('candidates-tab')?.focus()
    } else if (selection.opener === 'list') document.getElementById(cardId(selection.id))?.focus()
    else map.current?.focusCandidate(selection.id)
  }

  return (
    <Layout
      atlas={atlas}
      exportMenu={<ExportMenu visible={visible} log={fieldLog.log} />}
      sidebar={
        <SidebarTabs
          // A shared view is about candidates, so its link opens on their list.
          initialTab={encodeViewHash(opened.view) ? 'candidates' : 'layers'}
          candidateCount={visible.length}
          layers={<LayerControls manifest={manifest} state={layerState} dispatch={dispatch} />}
          candidates={
            <>
              <CandidateList
                manifest={manifest}
                view={view}
                visible={visible}
                log={fieldLog.log}
                selectedId={selectedId}
                tools={<FieldLogTools log={fieldLog.log} candidateIds={candidateIds} onReplace={fieldLog.replace} />}
                onViewChange={setView}
                onSelect={selectFromList}
              />
              {hasObservations && <ObservationList observations={atlas.observations} />}
            </>
          }
        />
      }
    >
      <MapView
        ref={map}
        extent={manifest.bounds}
        layers={mapLayers}
        overlayOpacity={layerState.opacity / 100}
        candidates={markers}
        observations={atlas.observations}
        selectedId={selectedId}
        onCandidateClick={(id) => setSelection({ id, opener: 'map' })}
        onLayerLoad={(key, attempt) => dispatch({ type: 'loaded', key, attempt })}
        onLayerError={(key, attempt) => dispatch({ type: 'failed', key, attempt, reason: 'the image couldn’t be loaded' })}
        onZoomChange={setZoom}
        onProbe={setProbe}
      />
      <div className="absolute top-[77px] left-[23px] z-[600] flex max-w-[430px] flex-col gap-2 max-tablet:inset-x-3 max-tablet:top-16 max-tablet:max-w-none">
        {atlas.warnings.length > 0 && (
          <div role="status" className={NOTICE}>
            {atlas.warnings.map((warning) => (
              <p key={warning.file}>Couldn’t load {formatDataError(warning)}</p>
            ))}
          </div>
        )}
        <FieldLogNotices fieldLog={fieldLog} className={NOTICE} />
        {linkProblem && (
          <div role="status" aria-label="Link notice" className={`${NOTICE} flex items-start gap-3`}>
            <p className="flex-1">{linkProblem} The default view is open instead.</p>
            <button
              type="button"
              aria-label="Dismiss link notice"
              onClick={() => setLinkProblem(null)}
              className="-my-0.5 px-1 text-[15px] leading-none"
            >
              ×
            </button>
          </div>
        )}
      </div>
      {/* The canopy readout sits left of the map buttons; all stay beneath the detail card. */}
      <div className="pointer-events-none absolute top-5 right-[22px] z-[640] flex items-start justify-end gap-2 max-tablet:inset-x-3 max-tablet:top-3">
        <CanopyReadout source={source} manifest={manifest} point={probe} />
        {hasObservations && (
          <button
            type="button"
            onClick={() => map.current?.fitObservations()}
            aria-label="Fit map to observations"
            className={MAP_BUTTON}
          >
            Observations
          </button>
        )}
        <button
          type="button"
          onClick={() => setLegendOpen((open) => !open)}
          aria-expanded={legendOpen}
          aria-controls="map-legend"
          className={MAP_BUTTON}
        >
          Legend
        </button>
      </div>
      {legendOpen && (
        <Legend
          manifest={manifest}
          state={layerState}
          zoom={zoom}
          pools={pools}
          observations={hasObservations}
          onClose={() => setLegendOpen(false)}
          // On a phone the open detail card takes the legend's place.
          className={selected ? 'max-tablet:hidden' : ''}
        />
      )}
      {selected && (
        <CandidateDetail
          candidate={selected}
          manifest={manifest}
          method={atlas.method}
          logEntry={fieldLog.log[selected.properties.id]}
          saving={fieldLog.canSave && !fieldLog.saveError}
          onLogChange={(change) => fieldLog.update(selected.properties.id, change)}
          onClose={closeDetail}
        />
      )}
    </Layout>
  )
}

/** The page frame. The atlas is null while it loads, which keeps the method button disabled. */
function Layout({ atlas, sidebar, exportMenu, children }: { atlas: Atlas | null; sidebar: ReactNode; exportMenu: ReactNode; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <Topbar atlas={atlas} exportMenu={exportMenu} />
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
          {sidebar}
        </aside>
        <main aria-label="Interactive scouting map" className="relative min-w-0 flex-1 bg-map">
          {children}
        </main>
      </div>
    </div>
  )
}

const MAP_BUTTON =
  'pointer-events-auto flex-none rounded-[5px] border border-[#d8ded2] bg-sheet/95 px-3 py-2.5 text-[10px] shadow-[0_3px_14px_#233a1c0c] max-tablet:p-[9px] max-tablet:text-[9px]'

const NOTICE = 'rounded-[5px] border border-alert-line bg-alert px-3.5 py-2.5 text-[11px] text-alert-text shadow-panel'

type Tab = 'layers' | 'candidates'

/** The sidebar's two panels, as ARIA tabs: arrow keys move between them. */
function SidebarTabs({
  initialTab,
  layers,
  candidates,
  candidateCount,
}: {
  initialTab: Tab
  layers: ReactNode
  candidates: ReactNode
  candidateCount: number
}) {
  const [tab, setTab] = useState<Tab>(initialTab)
  const tabs: readonly [key: Tab, label: ReactNode][] = [
    ['layers', 'Map layers'],
    [
      'candidates',
      <>
        Candidates{' '}
        <span data-testid="candidate-count" className="ml-1 rounded-[4px] bg-[#e6ebdf] px-[5px] py-0.5 text-[10px]">
          {candidateCount}
        </span>
      </>,
    ],
  ]

  function moveWithArrows(event: KeyboardEvent) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    const next: Tab = tab === 'layers' ? 'candidates' : 'layers'
    setTab(next)
    document.getElementById(`${next}-tab`)?.focus()
  }

  return (
    <>
      <div
        role="tablist"
        aria-label="Atlas panels"
        onKeyDown={moveWithArrows}
        className="flex flex-none gap-[27px] border-y border-line px-[23px] max-desktop:px-[19px] wide:px-7"
      >
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`${key}-tab`}
            aria-selected={tab === key}
            aria-controls={`${key}-panel`}
            tabIndex={tab === key ? 0 : -1}
            onClick={() => setTab(key)}
            className="border-b-2 border-transparent pt-[13px] pb-[11px] text-[12px] font-semibold text-[#66756c] aria-selected:border-ink aria-selected:text-ink"
          >
            {label}
          </button>
        ))}
      </div>
      {tabs.map(([key]) => (
        <div
          key={key}
          role="tabpanel"
          id={`${key}-panel`}
          aria-labelledby={`${key}-tab`}
          hidden={tab !== key}
          className="min-h-0 flex-1 overflow-auto px-[23px] pt-[19px] pb-5 [scrollbar-color:#c4cfbf_transparent] [scrollbar-width:thin] max-desktop:px-[19px] wide:px-7"
        >
          {key === 'layers' ? layers : candidates}
        </div>
      ))}
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

function Topbar({ atlas, exportMenu }: { atlas: Atlas | null; exportMenu: ReactNode }) {
  const [methodOpen, setMethodOpen] = useState(false)
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
      <button
        type="button"
        disabled={!atlas}
        aria-haspopup="dialog"
        onClick={() => setMethodOpen(true)}
        className="ml-auto flex flex-none items-center gap-[7px] py-2 text-[12px] text-topbar-text disabled:opacity-50"
      >
        <span aria-hidden="true" className="grid size-[15px] place-items-center rounded-full border border-topbar-muted font-display text-[11px]">
          i
        </span>
        <span className="max-tablet:sr-only">Method and sources</span>
      </button>
      {atlas && methodOpen && <MethodDialog atlas={atlas} onClose={() => setMethodOpen(false)} />}
      <div className="flex flex-col items-end gap-1.5">
        <span className="flex items-center gap-[7px] text-[10px] font-bold tracking-[.12em] text-scenario max-tablet:text-[8px] max-tablet:tracking-[.05em]">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-amber-dot" />
          LOW WATER · 2027
        </span>
        <span className="text-[11px] text-topbar-muted max-desktop:hidden">Occupancy assumed for planning</span>
      </div>
      {exportMenu}
    </header>
  )
}
