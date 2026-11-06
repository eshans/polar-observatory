export type PoleId = 'north' | 'south'

/** Daily sea ice extent (million km²), indexed by day of year (0 = Jan 1). null = no reading. */
export type DoySeries = (number | null)[]

export interface SeaIce {
  pole: PoleId
  latest: { date: string; extent: number; change1d: number | null; change7d: number | null }
  /** 1981–2010 climatology by day of year */
  climatology: { median: number[]; p10: number[]; p90: number[]; p25: number[]; p75: number[] }
  /** every full or partial year since 1979 */
  years: Record<string, DoySeries>
  /** today's day-of-year value ranked against every year (1 = lowest) */
  rank: { position: number; of: number; doy: number }
  /** lowest annual minimum and highest annual maximum on record */
  recordLow: { year: number; extent: number; date: string }
  recordHigh: { year: number; extent: number; date: string }
}

export interface StationReading {
  id: string
  name: string
  place: string
  lat: number
  lon: number
  /** IANA zone the station keeps (South Pole runs on New Zealand time) */
  tz: string
  note: string
  elevation: number
  time: string
  temp: number
  feelsLike: number
  wind: number
  gusts: number
  windDir: number
  humidity: number
  code: number
  /** last 24 h + next 24 h hourly temperatures */
  hourly: { time: string; temp: number }[]
}

export interface Stations {
  pole: PoleId
  stations: StationReading[]
}

export interface Aurora {
  pole: PoleId
  observed: string
  forecast: string
  /** [lon, lat, probability %] for every 1°×1° cell with any chance, in this hemisphere */
  cells: [number, number, number][]
  kp: { time: string; kp: number; predicted: boolean; scale: string | null }[]
  spots: { name: string; lat: number; lon: number; chance: number }[]
}

export interface Iceberg {
  name: string
  lengthKm: number
  widthKm: number
  lat: number
  lon: number
  areaKm2: number
  updated: string
}

export interface DeepTime {
  pole: PoleId
  /** [years before 2000, value] */
  climate: [number, number][]
  climateKind: 'temp' | 'd18o'
  co2: [number, number][]
  co2Now: { date: string; ppm: number } | null
}

/** A point drawn on PolarMap. */
export interface MapMarker {
  id: string
  lat: number
  lon: number
  label?: string
  title?: string
  /** radius in map units (map is 1000 across) */
  r?: number
  tone?: 'aurora' | 'ice' | 'frost' | 'ember'
  href?: string
}
