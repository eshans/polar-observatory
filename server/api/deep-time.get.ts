// Ice core climate records (bundled; see scripts/build-ice-cores.mjs) plus today's CO2 from Mauna Loa (NOAA GML).
import cores from '../data/ice-cores.json'

async function latestCo2(): Promise<DeepTime['co2Now']> {
  try {
    const text = await $fetch<string>('https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_mm_mlo.txt', { responseType: 'text', timeout: 15_000, retry: 1 })
    // year month decimal monthly_average deseasonalized ...
    const last = text.split('\n').filter((l) => l.trim() && !l.startsWith('#')).at(-1)?.trim().split(/\s+/)
    if (!last) return null
    const ppm = Number(last[3])
    return Number.isFinite(ppm) && ppm > 0 ? { date: `${last[0]}-${last[1]!.padStart(2, '0')}`, ppm } : null
  } catch {
    return null // the ice core record still renders without today's value
  }
}

export default defineCachedEventHandler(
  async (event): Promise<DeepTime> => {
    const pole = getPole(event)
    const co2 = cores.co2 as [number, number][]
    const climate = (pole === 'north' ? cores.greenlandD18O : cores.antarcticTemp) as [number, number][]
    const oldest = climate.at(-1)![0]
    return {
      pole,
      climate,
      climateKind: pole === 'north' ? 'd18o' : 'temp',
      co2: co2.filter(([age]) => age <= oldest + 2000),
      co2Now: await latestCo2(),
    }
  },
  { base: 'kv', name: 'deep-time', maxAge: 60 * 60 * 24, swr: true, getKey: (event) => getPole(event) },
)
