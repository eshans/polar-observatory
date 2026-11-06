// Daily sea ice extent from the NSIDC Sea Ice Index v4 (keyless CSV, updated daily, ~1 day behind).
// https://nsidc.org/data/g02135
const NSIDC = 'https://noaadata.apps.nsidc.org/NOAA/G02135'

const round = (n: number) => Math.round(n * 1000) / 1000
const round2 = (n: number) => Math.round(n * 100) / 100

async function fetchCsv(url: string): Promise<string[][]> {
  let text: string
  try {
    text = await $fetch<string>(url, { responseType: 'text', timeout: 30_000, retry: 1 })
  } catch (err: any) {
    const status: number | undefined = err?.response?.status
    throw createError({ statusCode: 502, statusMessage: `NSIDC is not responding${status ? ` (${status})` : ''}. Try again shortly.` })
  }
  return text
    .split('\n')
    .map((line) => line.split(',').map((cell) => cell.trim()))
    .filter((cells) => /^\d+$/.test(cells[0] ?? '')) // drops the two header rows and blank lines
}

/** 0-based day of year in UTC. */
function doyOf(y: number, m: number, d: number) {
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86_400_000)
}

/** Fill short interior gaps (the 1978–1987 record is every other day) by linear interpolation. */
function fillGaps(series: DoySeries, maxGap = 3) {
  let last = -1
  for (let i = 0; i < series.length; i++) {
    if (series[i] === null) continue
    const gap = i - last - 1
    if (last >= 0 && gap > 0 && gap <= maxGap) {
      const a = series[last]!
      const b = series[i]!
      for (let k = 1; k <= gap; k++) series[last + k] = round2(a + ((b - a) * k) / (gap + 1))
    }
    last = i
  }
}

export default defineCachedEventHandler(
  async (event): Promise<SeaIce> => {
    const pole = getPole(event)
    const P = pole === 'north' ? 'N' : 'S'
    const [daily, clim] = await Promise.all([
      fetchCsv(`${NSIDC}/${pole}/daily/data/${P}_seaice_extent_daily_v4.0.csv`),
      fetchCsv(`${NSIDC}/${pole}/daily/data/${P}_seaice_extent_climatology_1981-2010_v4.0.csv`),
    ])

    // ---- daily record → one 366-slot series per year
    const years: Record<string, DoySeries> = {}
    let latest = { y: 0, m: 0, d: 0, extent: 0 }
    for (const [ys, ms, ds, es] of daily) {
      const y = Number(ys)
      const extent = Number(es)
      if (y < 1979 || !Number.isFinite(extent) || extent <= 0) continue // 1978 is a two-month stub
      const m = Number(ms)
      const d = Number(ds)
      ;(years[y] ??= new Array(366).fill(null))[doyOf(y, m, d)] = round2(extent)
      latest = { y, m, d, extent }
    }
    Object.values(years).forEach((s) => fillGaps(s))

    const current = years[latest.y]!
    const doy = doyOf(latest.y, latest.m, latest.d)
    const valueDaysAgo = (n: number) => {
      const t = new Date(Date.UTC(latest.y, latest.m - 1, latest.d - n))
      const v = years[t.getUTCFullYear()]?.[doyOf(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate())]
      return v == null ? null : round(latest.extent - v)
    }

    // ---- rank today's value against the same day in every year
    const sameDay = Object.entries(years)
      .map(([y, s]) => ({ y: Number(y), v: s[doy] }))
      .filter((r): r is { y: number; v: number } => r.v != null)
      .sort((a, b) => a.v - b.v)

    // ---- annual extremes (completed years only for highs; any year can set a low)
    let recordLow = { year: 0, extent: Infinity, date: '' }
    let recordHigh = { year: 0, extent: -Infinity, date: '' }
    for (const [ys, series] of Object.entries(years)) {
      const y = Number(ys)
      series.forEach((v, i) => {
        if (v == null) return
        const date = new Date(Date.UTC(y, 0, 1 + i)).toISOString().slice(0, 10)
        if (v < recordLow.extent) recordLow = { year: y, extent: v, date }
        if (v > recordHigh.extent) recordHigh = { year: y, extent: v, date }
      })
    }

    // ---- climatology: DOY, mean, std, p10, p25, p50, p75, p90
    const col = (i: number) => clim.map((r) => round(Number(r[i])))

    return {
      pole,
      latest: {
        date: `${latest.y}-${String(latest.m).padStart(2, '0')}-${String(latest.d).padStart(2, '0')}`,
        extent: round(latest.extent),
        change1d: valueDaysAgo(1),
        change7d: valueDaysAgo(7),
      },
      climatology: { p10: col(3), p25: col(4), median: col(5), p75: col(6), p90: col(7) },
      years,
      rank: { position: sameDay.findIndex((r) => r.y === latest.y) + 1, of: sameDay.length, doy },
      recordLow,
      recordHigh,
    }
  },
  { base: 'kv', name: 'sea-ice', maxAge: 60 * 60 * 6, swr: true, getKey: (event) => getPole(event) },
)
