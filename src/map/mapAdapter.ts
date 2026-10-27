// The map adapter (ADR 0002): the only module that touches Leaflet. React
// creates it once per mount and drives it through this narrow interface;
// Leaflet reports back through the event callbacks.
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Candidate, FeatureCollection, LeafletBounds } from '../atlas/schemas.ts'
import {
  fixedRasterOpacity,
  isIndexContour,
  MINOR_CONTOUR_MIN_ZOOM,
  PANES,
  pathStyle,
  pointMarker,
  rasterPane,
  vectorPane,
} from './layerStyles.ts'

/**
 * A layer to draw. `revision` changes when the layer must be rebuilt from
 * scratch, e.g. to retry an image that failed to load.
 */
export type MapLayer =
  | { readonly key: string; readonly kind: 'geojson'; readonly data: FeatureCollection; readonly revision: number }
  | {
      readonly key: string
      readonly kind: 'raster'
      readonly url: string
      readonly bounds: LeafletBounds
      readonly revision: number
    }

export interface MapEvents {
  onCandidateClick(id: string): void
  /** A raster's image loaded, for the layer spec with this revision. */
  onLayerLoad(key: string, revision: number): void
  /** A raster's image failed to load, for the layer spec with this revision. */
  onLayerError(key: string, revision: number): void
  onZoomChange(zoom: number): void
}

export interface MapAdapter {
  /**
   * Shows exactly these layers. A layer keeps its Leaflet object, even while
   * hidden, until its source or revision changes.
   */
  setLayers(layers: readonly MapLayer[]): void
  /** Opacity, 0–1, of the evidence overlays. Base rasters and vector layers keep their own. */
  setOverlayOpacity(opacity: number): void
  setCandidates(candidates: readonly Candidate[]): void
  select(id: string | null): void
  /** Pans, zooming in if needed, so the candidate sits in view beside the detail panel. */
  reveal(id: string): void
  /** Moves keyboard focus to the candidate's marker. */
  focusCandidate(id: string): void
  fitTo(bounds: LeafletBounds): void
  destroy(): void
}

/** Contour labels are spaced on a grid of cells this size, in pixels, and capped. */
const CONTOUR_LABEL_CELL = { x: 150, y: 110 } as const
const MAX_CONTOUR_LABELS = 45

/** Revealing a candidate zooms to at least this, and no closer than the max, as the reference atlas did. */
const REVEAL_ZOOM = { min: 14, max: 15 } as const
/** On wide screens the detail panel covers the map's right side, so the candidate sits this far left of centre. */
const REVEAL_OFFSET_X = 140

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
  map.getPane('contourLabels')!.style.pointerEvents = 'none'

  const built = new Map<string, { spec: MapLayer; layer: L.Layer }>()
  const markers = new Map<string, L.Marker>()
  const candidateGroup = L.layerGroup().addTo(map)
  const contourLabels = L.layerGroup().addTo(map)
  let contourTimer: ReturnType<typeof setTimeout> | undefined
  let overlayOpacity = 0.65
  let selected: string | null = null

  map.on('zoomend', () => {
    const contours = built.get('contours')?.layer
    if (contours instanceof L.GeoJSON) contours.setStyle((feature) => pathStyle('contours', feature?.properties, map.getZoom()))
    events.onZoomChange(map.getZoom())
  })
  map.on('moveend', () => refreshContourLabels())

  function buildLayer(spec: MapLayer): L.Layer {
    const { key, revision } = spec
    if (spec.kind === 'raster') {
      const [[south, west], [north, east]] = spec.bounds
      return L.imageOverlay(
        spec.url,
        [
          [south, west],
          [north, east],
        ],
        {
          pane: rasterPane(key),
          opacity: fixedRasterOpacity(key) ?? overlayOpacity,
          interactive: false,
          className: `layer-${key}`,
        },
      )
        .on('load', () => events.onLayerLoad(key, revision))
        .on('error', () => events.onLayerError(key, revision))
    }
    // Leaflet only reads the features; its types just don't say readonly.
    return L.geoJSON(spec.data as unknown as GeoJSON.FeatureCollection, {
      pane: vectorPane(key),
      style: (feature) => pathStyle(key, feature?.properties, map.getZoom()),
      interactive: false,
      pointToLayer: (feature, latlng) => {
        const { className, glyph } = pointMarker(key)
        const name = (feature.properties as { name?: unknown } | null)?.name
        return L.marker(latlng, {
          pane: 'points',
          // These markers open nothing, so they stay out of the tab order.
          keyboard: false,
          ...(typeof name === 'string' ? { title: name } : {}),
          icon: L.divIcon({ className, html: `<span>${glyph}</span>`, iconSize: [17, 17], iconAnchor: [8, 8] }),
        })
      },
    })
  }

  function sameSource(a: MapLayer, b: MapLayer): boolean {
    if (a.revision !== b.revision) return false
    if (a.kind === 'raster' && b.kind === 'raster') return a.url === b.url
    if (a.kind === 'geojson' && b.kind === 'geojson') return a.data === b.data
    return false
  }

  function refreshContourLabels() {
    clearTimeout(contourTimer)
    contourTimer = setTimeout(() => {
      contourLabels.clearLayers()
      const contours = built.get('contours')
      if (!contours || contours.spec.kind !== 'geojson' || !map.hasLayer(contours.layer)) return
      if (map.getZoom() < MINOR_CONTOUR_MIN_ZOOM) return
      const bounds = map.getBounds()
      const cells = new Set<string>()
      for (const { geometry, properties } of contours.spec.data.features) {
        if (cells.size >= MAX_CONTOUR_LABELS) break
        const elevation = properties?.['elevation_ft']
        if (typeof elevation !== 'number' || !isIndexContour(properties)) continue
        const line = geometry?.['coordinates'] as readonly (readonly [number, number])[] | undefined
        const middle = line?.[Math.floor(line.length / 2)]
        if (!middle) continue
        const latLng = L.latLng(middle[1], middle[0])
        if (!bounds.contains(latLng)) continue
        const point = map.latLngToContainerPoint(latLng)
        const cell = `${Math.floor(point.x / CONTOUR_LABEL_CELL.x)}:${Math.floor(point.y / CONTOUR_LABEL_CELL.y)}`
        if (cells.has(cell)) continue
        cells.add(cell)
        L.tooltip({ permanent: true, direction: 'center', className: 'contour-label', opacity: 0.8, interactive: false, pane: 'contourLabels' })
          .setLatLng(latLng)
          .setContent(`${elevation.toLocaleString('en-US')}′`)
          .addTo(contourLabels)
      }
    }, 80)
  }

  function markSelected(id: string, on: boolean) {
    markers.get(id)?.getElement()?.classList.toggle('selected', on)
  }

  return {
    setLayers(next) {
      const keys = new Set(next.map((spec) => spec.key))
      for (const [key, { layer }] of built) {
        if (!keys.has(key)) layer.remove()
      }
      for (const spec of next) {
        let current = built.get(spec.key)
        if (!current || !sameSource(current.spec, spec)) {
          current?.layer.remove()
          current = { spec, layer: buildLayer(spec) }
          built.set(spec.key, current)
        }
        if (!map.hasLayer(current.layer)) current.layer.addTo(map)
      }
      // What Leaflet is actually drawing, for anyone checking the map against the controls.
      container.dataset['drawnLayers'] = [...built]
        .filter(([, { layer }]) => map.hasLayer(layer))
        .map(([key]) => key)
        .sort()
        .join(' ')
      refreshContourLabels()
    },

    setOverlayOpacity(opacity) {
      overlayOpacity = opacity
      for (const [key, { layer }] of built) {
        if (layer instanceof L.ImageOverlay && fixedRasterOpacity(key) === null) layer.setOpacity(opacity)
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

    reveal(id) {
      const latLng = markers.get(id)?.getLatLng()
      if (!latLng) return
      const zoom = Math.min(Math.max(map.getZoom(), REVEAL_ZOOM.min), REVEAL_ZOOM.max)
      // Below the tablet breakpoint the panel is a bottom sheet, not beside the map.
      const offset = window.matchMedia('(min-width: 50rem)').matches ? REVEAL_OFFSET_X : 0
      const centre = map.unproject(map.project(latLng, zoom).add([offset, 0]), zoom)
      map.setView(centre, zoom, { animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches })
    },

    focusCandidate(id) {
      markers.get(id)?.getElement()?.focus()
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
      clearTimeout(contourTimer)
      map.remove()
      built.clear()
      markers.clear()
    },
  }
}

/** `EP-04` → `E4`, `JP-10` → `J10`, as on the reference atlas's markers. */
function shortLabel(id: string): string {
  return id.replace(/^([EJ])P-0?/, '$1')
}
