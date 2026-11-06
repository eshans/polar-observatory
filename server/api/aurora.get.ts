// Aurora forecast from NOAA SWPC: the OVATION model's 30–90 minute outlook and the planetary Kp index.
// https://www.swpc.noaa.gov/products/aurora-30-minute-forecast
const SWPC = 'https://services.swpc.noaa.gov'

interface RawOvation {
  'Observation Time': string
  'Forecast Time': string
  coordinates: [number, number, number][]
}
interface RawKp {
  time_tag: string
  kp: number | string
  observed: 'observed' | 'estimated' | 'predicted'
  noaa_scale: string | null
}

const utc = (t: string) => (/[zZ]|[+-]\d\d:?\d\d$/.test(t) ? t : `${t}Z`)

export default defineCachedEventHandler(
  async (event): Promise<Aurora> => {
    const pole = getPole(event)
    const [ov, kp] = await Promise.all([
      upstreamFetch<RawOvation>('NOAA SWPC', `${SWPC}/json/ovation_aurora_latest.json`),
      upstreamFetch<RawKp[]>('NOAA SWPC', `${SWPC}/products/noaa-planetary-k-index-forecast.json`),
    ])

    const north = pole === 'north'
    const grid = new Map<string, number>()
    const cells: [number, number, number][] = []
    for (const [lon, lat, v] of ov.coordinates) {
      grid.set(`${lon},${lat}`, v)
      if (v >= 3 && (north ? lat >= 30 : lat <= -30)) cells.push([lon > 180 ? lon - 360 : lon, lat, v])
    }
    const chanceAt = (lat: number, lon: number) => grid.get(`${Math.round((lon + 360) % 360) % 360},${Math.round(lat)}`) ?? 0

    const since = Date.now() - 48 * 3_600_000
    return {
      pole,
      observed: ov['Observation Time'],
      forecast: ov['Forecast Time'],
      cells,
      kp: kp
        .map((k) => ({ time: utc(k.time_tag), kp: Number(k.kp), predicted: k.observed === 'predicted', scale: k.noaa_scale }))
        .filter((k) => Number.isFinite(k.kp) && Date.parse(k.time) >= since),
      spots: AURORA_SPOTS[pole].map((s) => ({ ...s, chance: chanceAt(s.lat, s.lon) })),
    }
  },
  { base: 'kv', name: 'aurora', maxAge: 60 * 10, swr: true, getKey: (event) => getPole(event) },
)
