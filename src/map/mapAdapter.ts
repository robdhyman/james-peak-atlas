// The map adapter (ADR 0002): the only module that touches Leaflet. React
// creates it once per mount and drives it through this narrow interface;
// Leaflet reports back through the event callbacks.
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Candidate, FeatureCollection, LeafletBounds } from '../atlas/schemas.ts'

export type MapLayer =
  | { readonly key: string; readonly kind: 'geojson'; readonly data: FeatureCollection }
  | { readonly key: string; readonly kind: 'raster'; readonly url: string; readonly bounds: LeafletBounds }

export interface MapEvents {
  onCandidateClick(id: string): void
}

export interface MapAdapter {
  /** Shows exactly these layers. A layer keeps its Leaflet object while its spec is unchanged. */
  setLayers(layers: readonly MapLayer[]): void
  setCandidates(candidates: readonly Candidate[]): void
  select(id: string | null): void
  fitTo(bounds: LeafletBounds): void
  destroy(): void
}

// Stacking order, bottom to top.
const PANES = { relief: 210, raster: 300, boundaries: 450, candidates: 620 } as const

const PATH_STYLES: Record<string, L.PathOptions> = {
  boundary: { color: '#375f44', weight: 2.2, opacity: 0.9, fill: false, dashArray: '8 5' },
}

const RASTER_OPACITY: Record<string, number> = { hillshade: 0.9 }

export function createMapAdapter(container: HTMLElement, events: MapEvents): MapAdapter {
  const map = L.map(container, {
    zoomControl: false,
    preferCanvas: true,
    zoomSnap: 0.25,
    minZoom: 10,
    maxZoom: 18,
  })
  L.control.zoom({ position: 'bottomright' }).addTo(map)
  L.control.scale({ position: 'bottomleft', imperial: true, metric: true, maxWidth: 130 }).addTo(map)
  map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>')
  map.attributionControl.addAttribution('USGS · USFS · NHD · NLCD')
  for (const [name, zIndex] of Object.entries(PANES)) map.createPane(name).style.zIndex = String(zIndex)

  const layers = new Map<string, { spec: MapLayer; layer: L.Layer }>()
  const markers = new Map<string, L.Marker>()
  const candidateGroup = L.layerGroup().addTo(map)
  let selected: string | null = null

  function buildLayer(spec: MapLayer): L.Layer {
    if (spec.kind === 'raster') {
      const [[south, west], [north, east]] = spec.bounds
      return L.imageOverlay(spec.url, [[south, west], [north, east]], {
        pane: spec.key === 'hillshade' ? 'relief' : 'raster',
        opacity: RASTER_OPACITY[spec.key] ?? 0.65,
        interactive: false,
      })
    }
    // Leaflet only reads the features; its types just don't say readonly.
    return L.geoJSON(spec.data as unknown as GeoJSON.FeatureCollection, {
      pane: 'boundaries',
      style: PATH_STYLES[spec.key] ?? {},
      interactive: false,
    })
  }

  function markSelected(id: string, on: boolean) {
    markers.get(id)?.getElement()?.classList.toggle('selected', on)
  }

  return {
    setLayers(next) {
      const keys = new Set(next.map((spec) => spec.key))
      for (const [key, { layer }] of layers) {
        if (!keys.has(key)) {
          layer.remove()
          layers.delete(key)
        }
      }
      for (const spec of next) {
        const current = layers.get(spec.key)
        if (current?.spec === spec) continue
        current?.layer.remove()
        layers.set(spec.key, { spec, layer: buildLayer(spec).addTo(map) })
      }
    },

    setCandidates(candidates) {
      candidateGroup.clearLayers()
      markers.clear()
      for (const { geometry, properties } of candidates) {
        const [lon, lat] = geometry.coordinates
        const { id, name, pool, score } = properties
        const label = `${id}: ${name}, scouting index ${Math.round(score)} / 100`
        const marker = L.marker([lat, lon], {
          pane: 'candidates',
          keyboard: true,
          riseOnHover: true,
          title: label,
          icon: L.divIcon({
            className: `candidate-marker${pool === 'nearby' ? '' : ' context'}`,
            html: `<span class="candidate-marker-core">${shortLabel(id)}</span>`,
            iconSize: [34, 34],
            iconAnchor: [17, 17],
          }),
        })
          .bindTooltip(`${id} · ${name}`, { direction: 'top', offset: [0, -15], className: 'candidate-tooltip' })
          .on('click', () => events.onCandidateClick(id))
          // Leaflet gives the icon role="button" but doesn't activate a div
          // icon from the keyboard, so Enter and Space are handled here.
          .on('keydown', ({ originalEvent }: L.LeafletKeyboardEvent) => {
            if (originalEvent.key !== 'Enter' && originalEvent.key !== ' ') return
            originalEvent.preventDefault()
            events.onCandidateClick(id)
          })
          .addTo(candidateGroup)
        // The icon's text is the short label; give its button a full name.
        marker.getElement()?.setAttribute('aria-label', label)
        markers.set(id, marker)
      }
      if (selected) markSelected(selected, true)
    },

    select(id) {
      if (selected) markSelected(selected, false)
      selected = id
      if (id) markSelected(id, true)
    },

    fitTo([[south, west], [north, east]]) {
      map.fitBounds(
        [
          [south, west],
          [north, east],
        ],
        { padding: [35, 35] },
      )
    },

    destroy() {
      map.remove()
      layers.clear()
      markers.clear()
    },
  }
}

/** `EP-04` → `E4`, `JP-10` → `J10`, as on the reference atlas's markers. */
function shortLabel(id: string): string {
  return id.replace(/^([EJ])P-0?/, '$1')
}
