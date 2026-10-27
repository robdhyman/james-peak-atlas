import { describe, expect, test } from 'vitest'
import type { Candidate } from '../atlas/schemas.ts'
import type { VisibleCandidate } from '../candidates/visibleList.ts'
import type { FieldLog } from '../fieldLog/fieldLog.ts'
import { toCsv, toGeoJson, toGpx } from './exportCandidates.ts'

const T1 = '2026-10-20T15:04:05.000Z'
const T2 = '2026-10-21T09:30:00.000Z'

// Two hand-made candidates. EP-04's position has more decimals than the
// export keeps; both carry raw fields the export must leave out.
function candidate(
  properties: Pick<Candidate['properties'], 'id' | 'name' | 'pool' | 'rank' | 'score' | 'components' | 'metrics' | 'route_status' | 'gmu'>,
  coordinates: readonly [number, number],
): Candidate {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates },
    properties: {
      scout_order: 1,
      within_east_portal_straightline_budget: properties.pool === 'nearby',
      rationale: ['Persistent seep'],
      cautions: ['Access unresolved'],
      latitude: coordinates[1],
      land: { access_note: 'not exported' },
      ...properties,
    },
  }
}

const EP_04 = candidate(
  {
    id: 'EP-04',
    name: 'Lower Ruby — seep bench',
    pool: 'nearby',
    rank: 4,
    score: 72.4,
    components: { water: 81.2, shelter: 64, darkness: 70.5, security: 58.3 },
    metrics: {
      water_distance_m: 120.4,
      darkness_m: 840.2,
      canopy_percent: 61.5,
      slope_deg: 9.8,
      roundtrip_lower_bound_miles: 4.12,
      elevation_ft: 10450,
      nearby_steep_terrain_percent: 18.6,
    },
    route_status: 'Walking route unverified.',
    gmu: '38',
  },
  [-105.68123449, 39.81234567],
)

const JP_07 = candidate(
  {
    id: 'JP-07',
    name: 'Upper Ruby, east bench',
    pool: 'wilderness_context',
    rank: 7,
    score: 75.6,
    components: { water: 70, shelter: 80, darkness: 90, security: 60 },
    metrics: {
      water_distance_m: 300,
      darkness_m: 1500.5,
      canopy_percent: 55,
      slope_deg: 14.2,
      roundtrip_lower_bound_miles: 13.4,
      elevation_ft: 11020,
      nearby_steep_terrain_percent: 40,
    },
    route_status: 'Over six-mile round-trip lower bound from East Portal',
    gmu: '29',
  },
  [-105.7, 39.85],
)

const visible = (...candidates: Candidate[]): VisibleCandidate[] =>
  candidates.map((c, index) => ({ candidate: c, position: index + 1, poolRank: c.properties.rank, pool: c.properties.pool }))

const BOTH = visible(EP_04, JP_07)

// Notes with every awkward character: &, <, quotes, a comma, a line break, and a formula.
const LOG: FieldLog = {
  'EP-04': { status: 'camera_placed', notes: 'Wallow & seep, "fresh" <tracks>\nSecond line', updated: T1 },
  'JP-07': { status: 'ruled_out', notes: '=SUM(A1:A2) at O’Brien\'s', updated: T2 },
  // An entry for a candidate that isn't in the list never reaches a file.
  'EP-05': { status: 'scouted', notes: 'Not shown', updated: T2 },
}

describe('GeoJSON', () => {
  test('matches the expected collection, positions [lon, lat] at six decimals', () => {
    const text = toGeoJson(BOTH, LOG)
    expect(text.endsWith('}\n')).toBe(true)
    expect(JSON.parse(text)).toEqual({
      type: 'FeatureCollection',
      name: 'James Peak scouting candidates',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-105.681234, 39.812346] },
          properties: {
            id: 'EP-04',
            name: 'Lower Ruby — seep bench',
            pool: 'Nearby',
            pool_rank: 4,
            scouting_index: 72.4,
            water: 81.2,
            shelter: 64,
            darkness: 70.5,
            security: 58.3,
            field_status: 'Camera placed',
            notes: 'Wallow & seep, "fresh" <tracks>\nSecond line',
            field_log_updated: T1,
            water_distance_m: 120.4,
            darkness_m: 840.2,
            canopy_percent: 61.5,
            slope_deg: 9.8,
            elevation_ft: 10450,
            nearby_steep_terrain_percent: 18.6,
            roundtrip_lower_bound_miles: 4.12,
            route_status: 'Walking route unverified.',
            gmu: '38',
          },
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-105.7, 39.85] },
          properties: {
            id: 'JP-07',
            name: 'Upper Ruby, east bench',
            pool: 'Wilderness context',
            pool_rank: 7,
            scouting_index: 75.6,
            water: 70,
            shelter: 80,
            darkness: 90,
            security: 60,
            field_status: 'Ruled out',
            notes: '=SUM(A1:A2) at O’Brien\'s',
            field_log_updated: T2,
            water_distance_m: 300,
            darkness_m: 1500.5,
            canopy_percent: 55,
            slope_deg: 14.2,
            elevation_ft: 11020,
            nearby_steep_terrain_percent: 40,
            roundtrip_lower_bound_miles: 13.4,
            route_status: 'Over six-mile round-trip lower bound from East Portal',
            gmu: '29',
          },
        },
      ],
    })
  })

  test('a candidate with no field log entry is To scout, with empty notes and no update time', () => {
    const [feature] = JSON.parse(toGeoJson(visible(JP_07), {})).features
    expect(feature.properties).toMatchObject({ field_status: 'To scout', notes: '', field_log_updated: null })
  })
})

describe('GPX', () => {
  test('matches the expected waypoints, with every text XML-escaped', () => {
    expect(toGpx(BOTH, LOG)).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<gpx version="1.1" creator="James Peak Scouting Atlas" xmlns="http://www.topografix.com/GPX/1/1">',
        '  <metadata><name>James Peak scouting candidates</name><desc>Candidate waypoints, not verified routes. WGS84.</desc></metadata>',
        '  <wpt lat="39.812346" lon="-105.681234">',
        '    <name>EP-04 Lower Ruby — seep bench</name>',
        '    <desc>Scouting index 72 / 100, a relative index and not a probability. Nearby #4. Field status: Camera placed. Walking route unverified. Notes: Wallow &amp; seep, &quot;fresh&quot; &lt;tracks&gt;',
        'Second line</desc>',
        '    <type>Scouting candidate</type>',
        '  </wpt>',
        '  <wpt lat="39.85" lon="-105.7">',
        '    <name>JP-07 Upper Ruby, east bench</name>',
        '    <desc>Scouting index 76 / 100, a relative index and not a probability. Wilderness context #7. Field status: Ruled out. Over six-mile round-trip lower bound from East Portal. Notes: =SUM(A1:A2) at O’Brien&apos;s</desc>',
        '    <type>Scouting candidate</type>',
        '  </wpt>',
        '</gpx>',
        '',
      ].join('\n'),
    )
  })

  test('waypoints only: no routes or tracks', () => {
    const text = toGpx(BOTH, LOG)
    expect(text.match(/<wpt /g)).toHaveLength(2)
    expect(text).not.toMatch(/<(rte|trk)\b/)
  })

  test('characters XML can’t hold become U+FFFD, so the file still parses', () => {
    const log: FieldLog = { 'JP-07': { notes: 'bell\u0007 and a lone \uD800 surrogate, but 🦌 is fine', updated: T1 } }
    expect(toGpx(visible(JP_07), log)).toContain('Notes: bell� and a lone � surrogate, but 🦌 is fine</desc>')
  })

  test('a candidate without notes has no Notes sentence', () => {
    expect(toGpx(visible(JP_07), {})).toContain('Field status: To scout. Over six-mile round-trip lower bound from East Portal.</desc>')
  })
})

describe('CSV', () => {
  const HEADER =
    'id,name,pool,pool_rank,scouting_index,water,shelter,darkness,security,latitude,longitude,field_status,notes,field_log_updated,' +
    'water_distance_m,darkness_m,canopy_percent,slope_deg,elevation_ft,nearby_steep_terrain_percent,roundtrip_lower_bound_miles,route_status,gmu'

  test('matches the expected RFC 4180 text, with a formula neutralised', () => {
    expect(toCsv(BOTH, LOG)).toBe(
      '﻿' +
        `${HEADER}\r\n` +
        'EP-04,Lower Ruby — seep bench,Nearby,4,72.4,81.2,64,70.5,58.3,39.812346,-105.681234,Camera placed,' +
        `"Wallow & seep, ""fresh"" <tracks>\nSecond line",${T1},120.4,840.2,61.5,9.8,10450,18.6,4.12,Walking route unverified.,38\r\n` +
        'JP-07,"Upper Ruby, east bench",Wilderness context,7,75.6,70,80,90,60,39.85,-105.7,Ruled out,' +
        `'=SUM(A1:A2) at O’Brien's,${T2},300,1500.5,55,14.2,11020,40,13.4,Over six-mile round-trip lower bound from East Portal,29\r\n`,
    )
  })

  // A carriage return also makes the cell quoted.
  test.each([
    ['=1+1', "'=1+1"],
    ['+1 bull', "'+1 bull"],
    ['-2 cows', "'-2 cows"],
    ['@here', "'@here"],
    ['\tTabbed', "'\tTabbed"],
    ['\rReturn', `"'\rReturn"`],
  ])('notes %j are written as %j', (notes, cell) => {
    const row = toCsv(visible(JP_07), { 'JP-07': { notes, updated: T1 } }).split('\r\n')[1]
    expect(row).toContain(`,To scout,${cell},${T1},`)
  })

  test('numbers are never neutralised: a negative longitude stays a number', () => {
    const [, row] = toCsv(visible(EP_04), {}).split('\r\n')
    expect(row).toContain(',39.812346,-105.681234,To scout,,,')
  })

  test('an empty list still has its header', () => {
    expect(toCsv([], {})).toBe(`﻿${HEADER}\r\n`)
  })
})

describe('what an export holds', () => {
  test('only the listed candidates, in list order, and only the exported fields', () => {
    const geojson = JSON.parse(toGeoJson(visible(JP_07, EP_04), LOG))
    expect(geojson.features.map((f: { properties: { id: string } }) => f.properties.id)).toEqual(['JP-07', 'EP-04'])
    for (const text of [toGeoJson(BOTH, LOG), toGpx(BOTH, LOG), toCsv(BOTH, LOG)]) {
      expect(text).not.toContain('Not shown')
      expect(text).not.toContain('not exported')
      expect(text).not.toContain('Persistent seep')
    }
  })
})
