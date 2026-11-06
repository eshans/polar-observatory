// Polar geometry and NASA GIBS imagery: everything the satellite view needs to line up.

export interface PoleInfo {
  id: PoleId
  name: string
  label: string
  region: string
  tagline: string
  epsg: 3413 | 3031
  /** projection constants (WGS84 polar stereographic) */
  lon0: number
  latTs: number
}

export const POLES: Record<PoleId, PoleInfo> = {
  north: {
    id: 'north',
    name: 'The Arctic',
    label: '90°N',
    region: 'Arctic',
    tagline: 'A frozen ocean ringed by tundra, where the sea itself turns to ice and drifts across the top of the world.',
    epsg: 3413,
    lon0: -45,
    latTs: 70,
  },
  south: {
    id: 'south',
    name: 'The Antarctic',
    label: '90°S',
    region: 'Antarctic',
    tagline: 'A continent buried under ice nearly 5 km thick, walled off by the stormiest ocean on Earth.',
    epsg: 3031,
    lon0: 0,
    latTs: -71,
  },
}

// ---------------------------------------------------------------- projection
const A = 6378137 // WGS84 semi-major axis (m)
const E = 0.0818191908426 // eccentricity
const D2R = Math.PI / 180

const tFn = (phi: number) => Math.tan(Math.PI / 4 - phi / 2) / ((1 - E * Math.sin(phi)) / (1 + E * Math.sin(phi))) ** (E / 2)
const mFn = (phi: number) => Math.cos(phi) / Math.sqrt(1 - E * E * Math.sin(phi) ** 2)

/** Distance from the pole on the projected plane, in metres (Snyder, Map Projections, eq. 21-34). */
export function polarRadius(lat: number, pole: PoleId): number {
  const info = POLES[pole]
  const s = pole === 'north' ? 1 : -1
  const phi = s * lat * D2R
  const phiC = s * info.latTs * D2R
  return (A * mFn(phiC) * tFn(phi)) / tFn(phiC)
}

/** Projected x/y in metres (EPSG:3413 or EPSG:3031). */
export function project(lat: number, lon: number, pole: PoleId): [number, number] {
  const rho = polarRadius(lat, pole)
  const dl = (lon - POLES[pole].lon0) * D2R
  return pole === 'north' ? [rho * Math.sin(dl), -rho * Math.cos(dl)] : [rho * Math.sin(dl), rho * Math.cos(dl)]
}

// ---------------------------------------------------------------- GIBS tiles
// Both polar grids span ±4,194,304 m with 512 px tiles: level 1 is 4×4 tiles, level 2 is 8×8.
export const GRID_HALF = 4_194_304

export type Zoom = 'wide' | 'close'
export const ZOOMS: Record<Zoom, { level: number; first: number; span: number; halfWidth: number; label: string }> = {
  wide: { level: 1, first: 0, span: 4, halfWidth: GRID_HALF, label: 'Wide' }, // whole grid
  close: { level: 2, first: 2, span: 4, halfWidth: GRID_HALF / 2, label: 'Close' }, // central 4×4 of level 2
}

/** Projected metres → 0..1 position within the visible square (y down). */
export function toView(x: number, y: number, zoom: Zoom): [number, number] {
  const h = ZOOMS[zoom].halfWidth
  return [(x + h) / (2 * h), (h - y) / (2 * h)]
}

export type LayerId = 'truecolor' | 'infrared' | 'moonlight'
export interface LayerInfo {
  id: string
  set: string
  ext: 'jpeg' | 'png'
  /** typical days before a full day appears */
  lag: number
  first: string
  label: string
  blurb: string
}

export const LAYERS: Record<LayerId, LayerInfo> = {
  truecolor: {
    id: 'VIIRS_NOAA20_CorrectedReflectance_TrueColor',
    set: '250m',
    ext: 'jpeg',
    lag: 1,
    first: '2022-01-14',
    label: 'True colour',
    blurb: 'What your eye would see: sea ice, cloud and open water in sunlight. Dark where the sun never rose.',
  },
  infrared: {
    id: 'VIIRS_NOAA20_Brightness_Temp_BandI5_Night',
    set: '250m',
    ext: 'png',
    lag: 1,
    first: '2022-01-14',
    label: 'Thermal',
    blurb: 'Heat, not light: warmer surfaces glow brighter. Works through the polar night, so storms and leads in the ice stay visible.',
  },
  moonlight: {
    id: 'VIIRS_NOAA20_DayNightBand_AtSensor_M15',
    set: '500m',
    ext: 'jpeg',
    lag: 2,
    first: '2026-03-16',
    label: 'Moonlight',
    blurb: 'The day/night band sees by moonlight and aurora. Brightest around full moon; near-black at new moon.',
  },
}

const GIBS = 'https://gibs.earthdata.nasa.gov/wmts'

export function tileUrl(pole: PoleId, layer: LayerId, date: string, zoom: Zoom, row: number, col: number) {
  const l = LAYERS[layer]
  return `${GIBS}/epsg${POLES[pole].epsg}/best/${l.id}/default/${date}/${l.set}/${ZOOMS[zoom].level}/${row}/${col}.${l.ext}`
}

export function baseTileUrl(pole: PoleId, zoom: Zoom, row: number, col: number) {
  return `${GIBS}/epsg${POLES[pole].epsg}/best/BlueMarble_ShadedRelief_Bathymetry/default/500m/${ZOOMS[zoom].level}/${row}/${col}.jpeg`
}

/** Rough solar declination (°) for a YYYY-MM-DD date: good enough to choose a sensible default layer. */
export function solarDeclination(iso: string): number {
  const d = new Date(`${iso}T12:00:00Z`)
  const doy = (d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86_400_000
  return 23.44 * Math.sin((2 * Math.PI * (doy - 80)) / 365.25)
}

/** True colour while the pole's hemisphere gets meaningful sunlight, thermal otherwise. */
export function autoLayer(pole: PoleId, date: string): LayerId {
  const dec = solarDeclination(date)
  return (pole === 'north' ? dec : -dec) > -8 ? 'truecolor' : 'infrared'
}
