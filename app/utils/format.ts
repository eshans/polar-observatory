// All times are shown in UTC so server-rendered and browser-rendered output always match.

export const fmtInt = (n: number) => Math.round(n).toLocaleString('en-US')

export const fmtDec = (n: number, digits = 1) =>
  n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })

const asDate = (v: string | number) =>
  typeof v === 'number' ? new Date(v) : new Date(v.length === 10 ? `${v}T12:00:00Z` : v)

export const fmtDate = (v: string | number) =>
  asDate(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

export const fmtShortDate = (v: string | number) =>
  asDate(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

export const fmtDateTime = (v: string | number) =>
  `${asDate(v).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC' })} UTC`

export const fmtWeekday = (v: string | number) =>
  asDate(v).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })

/** Shift a YYYY-MM-DD date by whole days. */
export function shiftDay(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function errorText(err: unknown): string {
  const e = err as { statusMessage?: string; data?: { statusMessage?: string }; message?: string } | null
  return e?.data?.statusMessage || e?.statusMessage || e?.message || 'Something went wrong'
}

export type TempUnit = 'C' | 'F'

export const fmtTemp = (c: number, unit: TempUnit = 'C', digits = 0) =>
  `${fmtDec(unit === 'C' ? c : (c * 9) / 5 + 32, digits).replace('-', '\u2212')}°`

/** Signed number with a true minus sign, e.g. "+0.57" / "\u22121.20". */
export const fmtSigned = (n: number, digits = 2) => `${n >= 0 ? '+' : '\u2212'}${fmtDec(Math.abs(n), digits)}`

/** Ordinal suffix: 1st, 2nd, 3rd, 4th… */
export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`
}

/** Day of year (0-based) → "Nov 5" (non-leap calendar). */
export const fmtDoy = (doy: number) => fmtShortDate(Date.UTC(2001, 0, 1 + doy))

/** Local wall-clock time in an IANA zone, e.g. "14:05". */
export const fmtLocalTime = (when: Date, tz: string) =>
  when.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz })

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
export const compass = (deg: number) => COMPASS[Math.round(deg / 22.5) % 16]!

/** WMO weather code → short label. */
export function weatherLabel(code: number): string {
  if (code === 0) return 'Clear'
  if (code === 1) return 'Mostly clear'
  if (code === 2) return 'Partly cloudy'
  if (code === 3) return 'Overcast'
  if (code === 45) return 'Fog'
  if (code === 48) return 'Freezing fog'
  if (code >= 51 && code <= 55) return 'Drizzle'
  if (code === 56 || code === 57) return 'Freezing drizzle'
  if (code >= 61 && code <= 65) return 'Rain'
  if (code === 66 || code === 67) return 'Freezing rain'
  if (code >= 71 && code <= 75) return 'Snow'
  if (code === 77) return 'Snow grains'
  if (code >= 80 && code <= 82) return 'Showers'
  if (code === 85 || code === 86) return 'Snow showers'
  if (code >= 95) return 'Thunderstorm'
  return '—'
}

/** Familiar areas (million km²) for putting sea ice anomalies in perspective. */
const AREAS: [string, number][] = [
  ['the UK', 0.243],
  ['Germany', 0.357],
  ['California', 0.424],
  ['France', 0.644],
  ['Texas', 0.696],
  ['Alaska', 1.718],
  ['Mexico', 1.964],
  ['Greenland', 2.166],
  ['Argentina', 2.78],
  ['India', 3.287],
]

/** Smaller familiar areas (km²) for icebergs. */
const SMALL_AREAS: [string, number][] = [
  ['Manhattan', 59],
  ['Washington, DC', 177],
  ['Malta', 316],
  ['Singapore', 735],
  ['New York City', 783],
  ['Hong Kong', 1106],
  ['Greater London', 1572],
  ['Luxembourg', 2586],
  ['Rhode Island', 3144],
  ['Delaware', 6446],
]

function closest(a: number, list: [string, number][]) {
  let best = list[0]!
  for (const area of list) if (Math.abs(Math.log(area[1] / a)) < Math.abs(Math.log(best[1] / a))) best = area
  return best
}

export function bergLike(km2: number): string {
  const best = closest(km2, SMALL_AREAS)
  const ratio = km2 / best[1]
  if (ratio < 0.75) return `${Math.round(ratio * 100)}% of ${best[0]}`
  return ratio > 1.35 ? `${fmtDec(ratio, 1)}× ${best[0]}` : `about ${best[0]}`
}

export function areaLike(millionKm2: number): string {
  const a = Math.abs(millionKm2)
  if (a < 0.15) return 'a rounding error at this scale'
  const best = closest(a, AREAS)
  const ratio = a / best[1]
  if (ratio < 0.75) return `about ${Math.round(ratio * 100)}% the size of ${best[0]}`
  return ratio > 1.35 ? `about ${fmtDec(ratio, 1)}× the size of ${best[0]}` : `about the size of ${best[0]}`
}
