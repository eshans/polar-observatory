// Turns NOAA Paleo ice core text files into the compact JSON in server/data/.
// Usage: node scripts/build-ice-cores.mjs <dir with the downloaded .txt files>
// Sources (NOAA NCEI, https://www.ncei.noaa.gov/pub/data/paleo/icecore/):
//   antarctica/antarctica2015co2composite.txt         Bereiter et al. 2015, CO2 composite, 800 kyr
//   antarctica/epica_domec/edc3deuttemp2007.txt        Jouzel et al. 2007, EPICA Dome C temperature, 800 kyr
//   greenland/summit/ngrip/isotopes/ngrip-d18o-50yr.txt NGRIP members 2004, δ18O 50-yr means, 123 kyr
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = process.argv[2]
const rows = (file, from) =>
  readFileSync(join(dir, file), 'utf8')
    .split('\n')
    .slice(from)
    .map((l) => l.trim().split(/\s+/))
    .filter((c) => c.length >= 2 && /^-?[\d,.]+$/.test(c[0]))

/** Average into fixed-width age bins so each series stays ~1–2k points. */
function bin(points, width) {
  const out = new Map()
  for (const [age, v] of points) {
    const k = Math.floor(age / width)
    const b = out.get(k) ?? [0, 0, 0]
    b[0] += age; b[1] += v; b[2]++
    out.set(k, b)
  }
  return [...out.values()].map(([a, v, n]) => [Math.round(a / n), Math.round((v / n) * 100) / 100]).sort((p, q) => p[0] - q[0])
}

// CO2: years before 1950 → years before 2000 (+50) for a common baseline with NGRIP
const co2 = rows('antarctica2015co2composite.txt', 138).map((c) => [Number(c[0]) + 50, Number(c[1])])
// EPICA: Bag ztop Age Deuterium Temperature; rows without a temperature are skipped
const epica = rows('edc3deuttemp2007.txt', 92).filter((c) => c.length >= 5).map((c) => [Number(c[2]) + 50, Number(c[4])])
// NGRIP: "Age  d18O", age may contain thousands separators
const ngrip = rows('ngrip-d18o-50yr.txt', 80).map((c) => [Number(c[0].replace(/,/g, '')), Number(c[1])])

const out = {
  co2: bin(co2, 300),
  antarcticTemp: bin(epica, 400),
  greenlandD18O: bin(ngrip, 100),
}
for (const [k, v] of Object.entries(out)) console.log(k, v.length, v[0], v.at(-1))
writeFileSync(new URL('../server/data/ice-cores.json', import.meta.url), JSON.stringify(out))
