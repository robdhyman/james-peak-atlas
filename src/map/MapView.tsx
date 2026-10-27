import { useEffect, useEffectEvent, useRef } from 'react'
import type { Candidate, LeafletBounds } from '../atlas/schemas.ts'
import { createMapAdapter, type MapAdapter, type MapLayer } from './mapAdapter.ts'

interface MapViewProps {
  extent: LeafletBounds
  layers: readonly MapLayer[]
  candidates: readonly Candidate[]
  selectedId: string | null
  onCandidateClick(id: string): void
}

/**
 * Owns the map adapter's lifecycle: created once on mount, removed on
 * unmount. Prop changes become adapter commands; they never re-create the map.
 */
export function MapView({ extent, layers, candidates, selectedId, onCandidateClick }: MapViewProps) {
  const container = useRef<HTMLDivElement>(null)
  const adapter = useRef<MapAdapter | null>(null)
  const candidateClicked = useEffectEvent((id: string) => onCandidateClick(id))

  useEffect(() => {
    if (!container.current) return
    const map = createMapAdapter(container.current, { onCandidateClick: (id) => candidateClicked(id) })
    adapter.current = map
    return () => {
      map.destroy()
      adapter.current = null
    }
  }, [])

  useEffect(() => adapter.current?.fitTo(extent), [extent])
  useEffect(() => adapter.current?.setLayers(layers), [layers])
  useEffect(() => adapter.current?.setCandidates(candidates), [candidates])
  useEffect(() => adapter.current?.select(selectedId), [selectedId])

  return <div ref={container} data-testid="map" className="atlas-map absolute inset-0 z-0" />
}
