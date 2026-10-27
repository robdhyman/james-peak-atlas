// The map adapter (ADR 0002): the only module that touches Leaflet. React
// creates it once per mount and drives it through this narrow interface;
// Leaflet reports back through the event callbacks.
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Candidate, FeatureCollection, LeafletBounds, Observation } from '../atlas/schemas.ts'
import { type FeaturePopup, featurePopup, POPUP_LAYERS } from './featurePopup.ts'
import {
  fixedRasterOpacity,
  isIndexContour,
  MINOR_CONTOUR_MIN_ZOOM,
  PANES,
  pathStyle,
  pointMarker,
  rasterPane,
  VECTOR_CLICK_TOLERANCE,
  VECTOR_STACK,
  vectorPane,
} from './layerStyles.ts'

/**
 * A layer to draw. `revision` changes when the layer must be rebuilt from
 * scratch, e.g. to retry an image that failed to load.
 */
export type MapLayer =
  | {
      readonly key: string
      readonly kind: 'geojson'
      readonly data: FeatureCollection
      readonly revision: number
      /** The layer's name, for a feature popup when the feature has no name of its own. */
      readonly label: string
    }
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
  /** The point under the pointer, or the last tap or click; null once the pointer leaves the map. */
  onProbe(point: { lat: number; lng: number } | null): void
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
  /** The owner's observations, drawn as evidence apart from the candidates. */
  setObservations(observations: readonly Observation[]): void
  select(id: string | null): void
  /** Pans, zooming in if needed, so the candidate sits in view beside the detail panel. */
  reveal(id: string): void
  /** Moves keyboard focus to the candidate's marker. */
  focusCandidate(id: string): void
  fitTo(bounds: LeafletBounds): void
  /** Fits the map to the observations, not so close that their surroundings vanish. */
  fitObservations(): void
  destroy(): void
}

/** Contour labels are spaced on a grid of cells this size, in pixels, and capped. */
const CONTOUR_LABEL_CELL = { x: 150, y: 110 } as const
const MAX_CONTOUR_LABELS = 45

/** Revealing a candidate zooms to at least this, and no closer than the max, as the reference atlas did. */
const REVEAL_ZOOM = { min: 14, max: 15 } as const
/** On wide screens the detail panel covers the map's right side, so the candidate sits this far left of centre. */
const REVEAL_OFFSET_X = 140

/** Fitting to the observations stops at this zoom and pads this far, as the reference atlas's focus control did. */
const OBSERVATION_FIT = { maxZoom: 15, padding: 70 } as const

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
  // Panes are created top first, so Tab meets the candidates before the
  // trailheads beneath them; each pane's z-index, not its DOM order, stacks it.
  for (const [name, zIndex] of Object.entries(PANES).toReversed()) map.createPane(name).style.zIndex = String(zIndex)
  // Leaflet opens a popup without telling a screen reader, so this says what it shows.
  const announcer = L.DomUtil.create('p', 'sr-only', container)
  announcer.setAttribute('role', 'status')
  map.getPane('contourLabels')!.style.pointerEvents = 'none'
  // One canvas for every vector layer but the contours (see vectorPane).
  const vectorRenderer = L.canvas({ pane: 'vectors', tolerance: VECTOR_CLICK_TOLERANCE })
  // The probe listens on the container, not through the map's mousemove:
  // the canvas renderer swallows its element's events and re-fires them at
  // most every 32 ms, which can drop the last move before the pointer stops.
  // Only a pointer that can hover (a mouse or a pen) follows moves and
  // leaves. Mouse events can't be trusted for that: browsers make them up
  // for touch, and Chromium on Linux follows every tap with a mouse leave
  // at (0, 0), which would clear the reading the tap just made. Touch has no
  // hover, so a tap (Leaflet's click, not on a marker or a control) probes.
  const probing = new AbortController()
  const probeAt = ({ lat, lng }: L.LatLng) => events.onProbe({ lat, lng })
  const hovers = ({ pointerType }: PointerEvent) => pointerType === 'mouse' || pointerType === 'pen'
  container.addEventListener(
    'pointermove',
    (event) => {
      if (hovers(event)) probeAt(map.mouseEventToLatLng(event))
    },
    { signal: probing.signal },
  )
  container.addEventListener(
    'pointerleave',
    (event) => {
      if (hovers(event)) events.onProbe(null)
    },
    { signal: probing.signal },
  )
  map.on('click', ({ latlng }: L.LeafletMouseEvent) => probeAt(latlng))

  const built = new Map<string, { spec: MapLayer; layer: L.Layer }>()
  const markers = new Map<string, L.Marker>()
  const candidateGroup = L.layerGroup().addTo(map)
  const observationGroup = L.layerGroup().addTo(map)
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
    const pane = vectorPane(key)
    const popups = POPUP_LAYERS.has(key)
    const popupFor = (feature: GeoJSON.Feature) => featurePopup(key, feature.properties, spec.label)
    // Leaflet only reads the features; its types just don't say readonly.
    const data = spec.data as unknown as GeoJSON.FeatureCollection
    return L.geoJSON(OUTLINED.has(key) ? outlines(data) : data, {
      pane,
      // Leaflet hands these options to every path it builds, renderer included.
      ...(pane === 'vectors' ? { renderer: vectorRenderer } : {}),
      style: (feature) => pathStyle(key, feature?.properties, map.getZoom()),
      interactive: popups,
      pointToLayer: (feature, latlng) => {
        const { className, glyph } = pointMarker(key)
        const name = popupFor(feature)?.title
        const marker = L.marker(latlng, {
          pane: 'points',
          // A marker is in the tab order only when it opens a popup.
          keyboard: popups,
          ...(name ? { title: name } : {}),
          icon: L.divIcon({ className, html: `<span>${glyph}</span>`, iconSize: [24, 24], iconAnchor: [12, 12] }),
        })
        if (!popups) return marker
        // Leaflet makes the icon a button but doesn't open its popup from the
        // keyboard, as with the candidate markers. Escape closes it again.
        return marker
          .on('add', () => marker.getElement()?.setAttribute('aria-label', `${name}, ${spec.label}`))
          .on('keydown', ({ originalEvent }: L.LeafletKeyboardEvent) => {
            if (originalEvent.key === 'Escape' && marker.isPopupOpen()) {
              originalEvent.stopPropagation()
              marker.closePopup()
            } else if (originalEvent.key === 'Enter' || originalEvent.key === ' ') {
              originalEvent.preventDefault()
              marker.openPopup()
            }
          })
      },
      ...(popups
        ? {
            onEachFeature: (feature: GeoJSON.Feature, layer: L.Layer) => {
              const popup = popupFor(feature)
              if (!popup) return
              layer
                .bindPopup(() => popupElement(popup), { maxWidth: 250, className: 'feature-popup' })
                .on('popupopen', () => (announcer.textContent = popupAnnouncement(popup)))
                .on('popupclose', () => (announcer.textContent = ''))
            },
          }
        : {}),
    })
  }

  /** Puts the shared vector canvas's layers back in VECTOR_STACK order; a layer added later would otherwise draw on top. */
  function restackVectors() {
    for (const key of VECTOR_STACK) {
      const layer = built.get(key)?.layer
      if (layer instanceof L.GeoJSON && map.hasLayer(layer)) layer.bringToFront()
    }
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
      let added = false
      for (const spec of next) {
        let current = built.get(spec.key)
        if (!current || !sameSource(current.spec, spec)) {
          current?.layer.remove()
          current = { spec, layer: buildLayer(spec) }
          built.set(spec.key, current)
        }
        if (!map.hasLayer(current.layer)) {
          current.layer.addTo(map)
          added = true
        }
      }
      if (added) restackVectors()
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
        // It ends with the icon's own text, so a speech user can say what they see (WCAG 2.5.3).
        const label = `${id}: ${name}, scouting index ${Math.round(score)} / 100, marker ${shortLabel(id)}`
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

    setObservations(observations) {
      observationGroup.clearLayers()
      for (const { geometry, properties } of observations) {
        const [lon, lat] = geometry.coordinates
        const { id, name } = properties
        L.marker([lat, lon], {
          pane: 'observations',
          // The observations list carries the same text, so the markers stay out of the tab order.
          keyboard: false,
          title: `${id}: ${name}, observation`,
          icon: L.divIcon({ className: 'observation-marker', html: '<span></span>', iconSize: [20, 20], iconAnchor: [10, 10] }),
        })
          .bindTooltip(`${id} · ${name}`, { direction: 'top', offset: [0, -11], className: 'candidate-tooltip' })
          .addTo(observationGroup)
      }
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

    fitObservations() {
      const points = observationGroup.getLayers().flatMap((layer) => (layer instanceof L.Marker ? [layer.getLatLng()] : []))
      if (points.length === 0) return
      const { maxZoom, padding } = OBSERVATION_FIT
      map.fitBounds(L.latLngBounds(points), { maxZoom, padding: [padding, padding] })
    },

    destroy() {
      clearTimeout(contourTimer)
      probing.abort()
      map.remove()
      announcer.remove()
      built.clear()
      markers.clear()
    },
  }
}

/**
 * Layers drawn as their rings only. Their polygons are unfilled, but a canvas
 * still counts a click anywhere inside one as a click on it, which would
 * cover every trail and stream within a GMU.
 */
const OUTLINED: ReadonlySet<string> = new Set(['boundary', 'gmu_boundaries'])

/** The same features, with each polygon's rings as lines. */
function outlines(data: GeoJSON.FeatureCollection): GeoJSON.FeatureCollection {
  return {
    ...data,
    features: data.features.map((feature) => {
      const { geometry } = feature
      if (geometry?.type === 'Polygon') return { ...feature, geometry: { type: 'MultiLineString', coordinates: geometry.coordinates } }
      if (geometry?.type === 'MultiPolygon') {
        return { ...feature, geometry: { type: 'MultiLineString', coordinates: geometry.coordinates.flat() } }
      }
      return feature
    }),
  }
}

/** A popup's content as one sentence for a screen reader: "Lake Caroline, lake pond. Its cautions." */
function popupAnnouncement({ title, meta, notes }: FeaturePopup): string {
  return [`${[title, meta].filter(Boolean).join(', ')}.`, ...notes].join(' ')
}

/** A popup's content, built from text nodes so that no property value is ever read as HTML. */
function popupElement({ title, meta, notes }: FeaturePopup): HTMLElement {
  const root = document.createElement('div')
  const line = (className: string, text: string) => {
    const element = document.createElement('div')
    element.className = className
    element.textContent = text
    root.append(element)
  }
  line('feature-popup-title', title)
  if (meta) line('feature-popup-meta', meta)
  for (const note of notes) line('feature-popup-note', note)
  return root
}

/** `EP-04` → `E4`, `JP-10` → `J10`, as on the reference atlas's markers. */
function shortLabel(id: string): string {
  return id.replace(/^([EJ])P-0?/, '$1')
}
