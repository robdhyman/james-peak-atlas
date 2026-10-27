// Export: the visible list plus the field log, as GeoJSON, GPX or CSV text.
// Pure, so every format can be pinned by fixed expected output. Starting the
// download is the UI's job. Only candidates go in: never observations, base
// rasters or routes.
import type { VisibleCandidate } from '../candidates/visibleList.ts'
import { FIELD_STATUS_LABELS, type FieldLog, fieldStatusOf } from '../fieldLog/fieldLog.ts'
import { formatPoolRank, formatScoutingIndex, POOL_LABELS } from '../ui/format.ts'

export const EXPORT_FORMATS = ['geojson', 'gpx', 'csv'] as const
export type ExportFormat = (typeof EXPORT_FORMATS)[number]

const TITLE = 'James Peak scouting candidates'

/** Six decimal places, about 0.1 m: the bundle's own precision, used by every format. */
const COORDINATE_DECIMALS = 6

/**
 * Every exported field, in column order. Fields are picked one by one, never
 * spread from the record, so nothing reaches a file by accident. GeoJSON
 * keeps the position in its geometry instead of the latitude and longitude.
 */
const COLUMNS = [
  'id',
  'name',
  'pool',
  'pool_rank',
  'scouting_index',
  'water',
  'shelter',
  'darkness',
  'security',
  'latitude',
  'longitude',
  'field_status',
  'notes',
  'field_log_updated',
  'water_distance_m',
  'darkness_m',
  'canopy_percent',
  'slope_deg',
  'elevation_ft',
  'nearby_steep_terrain_percent',
  'roundtrip_lower_bound_miles',
  'route_status',
  'gmu',
] as const

type Value = string | number | null

function recordOf({ candidate, pool, poolRank }: VisibleCandidate, log: FieldLog): Readonly<Record<(typeof COLUMNS)[number], Value>> {
  const { id, name, score, components, metrics, route_status, gmu } = candidate.properties
  const [longitude, latitude] = candidate.geometry.coordinates
  const entry = log[id]
  return {
    id,
    name,
    pool: POOL_LABELS[pool],
    pool_rank: poolRank,
    scouting_index: score,
    water: components.water,
    shelter: components.shelter,
    darkness: components.darkness,
    security: components.security,
    latitude: roundCoordinate(latitude),
    longitude: roundCoordinate(longitude),
    field_status: FIELD_STATUS_LABELS[fieldStatusOf(log, id)],
    notes: entry?.notes ?? '',
    field_log_updated: entry?.updated ?? null,
    water_distance_m: metrics.water_distance_m,
    darkness_m: metrics.darkness_m,
    canopy_percent: metrics.canopy_percent,
    slope_deg: metrics.slope_deg,
    elevation_ft: metrics.elevation_ft,
    nearby_steep_terrain_percent: metrics.nearby_steep_terrain_percent,
    roundtrip_lower_bound_miles: metrics.roundtrip_lower_bound_miles,
    route_status,
    gmu,
  }
}

/** A FeatureCollection of points, positions `[lon, lat]`. */
export function toGeoJson(visible: readonly VisibleCandidate[], log: FieldLog): string {
  const features = visible.map((entry) => {
    const { latitude, longitude, ...properties } = recordOf(entry, log)
    return { type: 'Feature', geometry: { type: 'Point', coordinates: [longitude, latitude] }, properties }
  })
  return `${JSON.stringify({ type: 'FeatureCollection', name: TITLE, features }, null, 2)}\n`
}

/** GPX 1.1 waypoints only: no routes or tracks. Every text and attribute is XML-escaped. */
export function toGpx(visible: readonly VisibleCandidate[], log: FieldLog): string {
  const waypoints = visible.map((entry) => {
    const record = recordOf(entry, log)
    const { id, name, score, route_status } = entry.candidate.properties
    const desc = [
      `Scouting index ${formatScoutingIndex(score)}, a relative index and not a probability.`,
      `${formatPoolRank(entry.pool, entry.poolRank)}.`,
      `Field status: ${record.field_status}.`,
      `${route_status.replace(/\.$/, '')}.`,
      ...(record.notes ? [`Notes: ${record.notes}`] : []),
    ].join(' ')
    return [
      `  <wpt lat="${xml(String(record.latitude))}" lon="${xml(String(record.longitude))}">`,
      `    <name>${xml(`${id} ${name}`)}</name>`,
      `    <desc>${xml(desc)}</desc>`,
      '    <type>Scouting candidate</type>',
      '  </wpt>',
    ].join('\n')
  })
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="James Peak Scouting Atlas" xmlns="http://www.topografix.com/GPX/1/1">',
    `  <metadata><name>${TITLE}</name><desc>Candidate waypoints, not verified routes. WGS84.</desc></metadata>`,
    ...waypoints,
    '</gpx>',
    '',
  ].join('\n')
}

/**
 * RFC 4180: CRLF line ends, and a cell holding a comma, quote or line break
 * is quoted with its quotes doubled. A UTF-8 byte order mark leads, so a
 * spreadsheet reads the names' dashes correctly.
 */
export function toCsv(visible: readonly VisibleCandidate[], log: FieldLog): string {
  const rows = visible.map((entry) => {
    const record = recordOf(entry, log)
    return COLUMNS.map((column) => record[column])
  })
  const lines = [COLUMNS, ...rows].map((cells) => cells.map(csvCell))
  return `﻿${lines.map((cells) => cells.join(',')).join('\r\n')}\r\n`
}

/** What each format needs to become a file. */
export const EXPORTS: Record<ExportFormat, { label: string; use: string; extension: string; type: string; serialise: typeof toCsv }> = {
  geojson: { label: 'GeoJSON', use: 'map apps', extension: 'geojson', type: 'application/geo+json', serialise: toGeoJson },
  gpx: { label: 'GPX', use: 'GPS devices', extension: 'gpx', type: 'application/gpx+xml', serialise: toGpx },
  csv: { label: 'CSV', use: 'spreadsheets', extension: 'csv', type: 'text/csv;charset=utf-8', serialise: toCsv },
}

function roundCoordinate(degrees: number): number {
  return Number(degrees.toFixed(COORDINATE_DECIMALS))
}

/**
 * Text a spreadsheet could read as a formula gets a leading apostrophe.
 * Numbers are written by the atlas itself, so a negative longitude stays a
 * number. Tab and carriage return lead formulas in some spreadsheets too.
 */
function csvCell(value: Value): string {
  if (value === null) return ''
  const text = typeof value === 'number' ? String(value) : /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

const XML_ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }

/** Characters XML 1.0 can't hold at all, escaped or not: most C0 controls, U+FFFE/U+FFFF and lone surrogates. */
const NOT_XML = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g

/** Escaped for text and attributes alike. A character XML can't hold becomes U+FFFD, so the file still parses. */
function xml(text: string): string {
  return text.replace(NOT_XML, '�').replace(/[&<>"']/g, (char) => XML_ENTITIES[char] ?? char)
}
