import { type Ref, useEffect, useEffectEvent, useImperativeHandle, useRef } from 'react'
import type { Candidate, LeafletBounds } from '../atlas/schemas.ts'
import { createMapAdapter, type MapAdapter, type MapEvents, type MapLayer } from './mapAdapter.ts'

interface MapViewProps extends MapEvents {
  extent: LeafletBounds
  layers: readonly MapLayer[]
  /** 0–1, applied to the evidence overlays only. */
  overlayOpacity: number
  candidates: readonly Candidate[]
  selectedId: string | null
  ref?: Ref<MapHandle>
}

/** One-off map commands that aren't state: React calls them from event handlers. */
export type MapHandle = Pick<MapAdapter, 'reveal' | 'focusCandidate'>

/**
 * Owns the map adapter's lifecycle: created once on mount, removed on
 * unmount. Prop changes become adapter commands; they never re-create the map.
 */
export function MapView({ extent, layers, overlayOpacity, candidates, selectedId, ref, ...handlers }: MapViewProps) {
  const container = useRef<HTMLDivElement>(null)
  const adapter = useRef<MapAdapter | null>(null)
  const candidateClicked = useEffectEvent((id: string) => handlers.onCandidateClick(id))
  const layerLoaded = useEffectEvent((key: string, revision: number) => handlers.onLayerLoad(key, revision))
  const layerFailed = useEffectEvent((key: string, revision: number) => handlers.onLayerError(key, revision))
  const zoomChanged = useEffectEvent((zoom: number) => handlers.onZoomChange(zoom))

  useEffect(() => {
    if (!container.current) return
    const map = createMapAdapter(container.current, {
      onCandidateClick: (id) => candidateClicked(id),
      onLayerLoad: (key, revision) => layerLoaded(key, revision),
      onLayerError: (key, revision) => layerFailed(key, revision),
      onZoomChange: (zoom) => zoomChanged(zoom),
    })
    adapter.current = map
    return () => {
      map.destroy()
      adapter.current = null
    }
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      reveal: (id) => adapter.current?.reveal(id),
      focusCandidate: (id) => adapter.current?.focusCandidate(id),
    }),
    [],
  )

  useEffect(() => adapter.current?.fitTo(extent), [extent])
  // Opacity first, so layers built in the same commit start at the right strength.
  useEffect(() => adapter.current?.setOverlayOpacity(overlayOpacity), [overlayOpacity])
  useEffect(() => adapter.current?.setLayers(layers), [layers])
  useEffect(() => adapter.current?.setCandidates(candidates), [candidates])
  useEffect(() => adapter.current?.select(selectedId), [selectedId])

  return <div ref={container} data-testid="map" className="atlas-map absolute inset-0 z-0" />
}
