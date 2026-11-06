<script setup lang="ts">
// The satellite view: a 4×4 mosaic of NASA GIBS tiles in polar stereographic, with a graticule and station pins.
const { pole } = usePole()

const todayUtc = () => new Date().toISOString().slice(0, 10)

const zoom = ref<Zoom>('wide')
const userLayer = ref<LayerId | null>(null)
const fillGaps = ref(true)
const showGrid = ref(true)
const showStations = ref(true)

const layer = computed<LayerId>(() => userLayer.value ?? autoLayer(pole.value, date.value))
const latestFor = (l: LayerId) => shiftDay(todayUtc(), -LAYERS[l].lag)

const date = ref(latestFor(autoLayer(pole.value, todayUtc())))
const latest = computed(() => latestFor(layer.value))
const earliest = computed(() => LAYERS[layer.value].first)
const clampDate = (d: string) => (d > latest.value ? latest.value : d < earliest.value ? earliest.value : d)

// keep the date valid when the layer's range changes (e.g. switching to Moonlight, which lags a day more)
watch(layer, () => (date.value = clampDate(date.value)))
// a new pole starts back on its automatic layer
watch(pole, () => (userLayer.value = null))

const step = (days: number) => (date.value = clampDate(shiftDay(date.value, days)))
const jumps = [
  { label: '−1 month', days: -30 },
  { label: '−6 months', days: -182 },
  { label: '−1 year', days: -365 },
]

// ---- tiles
const z = computed(() => ZOOMS[zoom.value])
const cells = computed(() => {
  const out: { key: string; row: number; col: number }[] = []
  for (let r = 0; r < z.value.span; r++)
    for (let c = 0; c < z.value.span; c++) out.push({ key: `${r}-${c}`, row: z.value.first + r, col: z.value.first + c })
  return out
})
const useBase = computed(() => layer.value === 'truecolor' && fillGaps.value)

const loaded = ref(0)
const failed = ref(0)
const batch = computed(() => `${pole.value}|${layer.value}|${date.value}|${zoom.value}`)
watch(batch, () => {
  loaded.value = 0
  failed.value = 0
})
const loading = computed(() => loaded.value + failed.value < cells.value.length)

// ---- overlay geometry (SVG viewBox 0..1000)
const V = 1000
const pt = (lat: number, lon: number) => {
  const [x, y] = project(lat, lon, pole.value)
  const [u, v] = toView(x, y, zoom.value)
  return { x: u * V, y: v * V }
}
const sgn = computed(() => (pole.value === 'north' ? 1 : -1))

const rings = computed(() =>
  [80, 70, 60, 50].map((lat) => {
    const r = (polarRadius(sgn.value * lat, pole.value) / (2 * z.value.halfWidth)) * V
    return { lat, r, lx: V / 2 + r * Math.sin(Math.PI / 6), ly: V / 2 - r * Math.cos(Math.PI / 6) }
  }).filter((ring) => ring.r < V * 0.72),
)

const meridians = computed(() => {
  const labelLat = sgn.value * (zoom.value === 'wide' ? 56 : 73)
  return Array.from({ length: 12 }, (_, i) => {
    const lon = i * 30 - 180 + 30 // -150 … 180
    const end = pt(sgn.value * 30, lon)
    const lab = pt(labelLat, lon)
    const name = lon === 0 ? '0°' : lon === 180 ? '180°' : lon > 0 ? `${lon}°E` : `${-lon}°W`
    return { lon, x2: end.x, y2: end.y, lx: lab.x, ly: lab.y, name }
  })
})

const pins = computed(() =>
  STATIONS[pole.value]
    .filter((s) => Math.abs(s.lat) < 89.9)
    .map((s) => ({ ...s, ...pt(s.lat, s.lon) }))
    .filter((p) => p.x > 10 && p.x < V - 10 && p.y > 10 && p.y < V - 10),
)

const scaleKm = computed(() => (zoom.value === 'wide' ? 1000 : 500))
const scaleLen = computed(() => ((scaleKm.value * 1000) / (2 * z.value.halfWidth)) * 100) // % of width
</script>

<template>
  <div class="flex flex-col gap-4">
    <figure class="relative m-0 aspect-square w-full overflow-hidden rounded-[28px] border border-line-strong bg-night shadow-2xl shadow-black/50">
      <!-- loading shimmer underneath -->
      <div class="skeleton absolute inset-0 rounded-none opacity-60" />

      <!-- Blue Marble reference, shows through satellite gaps -->
      <div v-if="useBase" class="absolute inset-0 grid grid-cols-4 brightness-[0.5] saturate-[0.85]">
        <img v-for="c in cells" :key="`b-${pole}-${zoom}-${c.key}`" :src="baseTileUrl(pole, zoom, c.row, c.col)" alt="" class="block size-full" decoding="async" />
      </div>

      <div class="absolute inset-0 grid grid-cols-4" :class="useBase && 'mix-blend-lighten'">
        <img
          v-for="c in cells"
          :key="`${batch}-${c.key}`"
          :src="tileUrl(pole, layer, date, zoom, c.row, c.col)"
          alt=""
          class="block size-full"
          decoding="async"
          @load="loaded++"
          @error="failed++"
        />
      </div>

      <!-- graticule + pins -->
      <svg :viewBox="`0 0 ${V} ${V}`" class="absolute inset-0 size-full" role="img" :aria-label="`${POLES[pole].region} seen from directly above the pole, ${LAYERS[layer].label.toLowerCase()} imagery for ${fmtDate(date)}`">
        <g v-if="showGrid" class="text-frost" fill="none" stroke="currentColor">
          <line v-for="m in meridians" :key="m.lon" :x1="V / 2" :y1="V / 2" :x2="m.x2" :y2="m.y2" stroke-opacity="0.16" stroke-width="1" />
          <circle v-for="ring in rings" :key="ring.lat" :cx="V / 2" :cy="V / 2" :r="ring.r" stroke-opacity="0.22" stroke-width="1" stroke-dasharray="2 5" />
          <g font-family="var(--font-mono)" font-size="15" fill="currentColor" stroke="none" fill-opacity="0.7">
            <text v-for="ring in rings" :key="`l${ring.lat}`" :x="ring.lx + 6" :y="ring.ly - 4" class="label-halo">{{ ring.lat }}°{{ pole === 'north' ? 'N' : 'S' }}</text>
            <text v-for="m in meridians" :key="`m${m.lon}`" :x="m.lx" :y="m.ly" text-anchor="middle" dominant-baseline="middle" class="label-halo" fill-opacity="0.55">{{ m.name }}</text>
          </g>
        </g>

        <!-- the pole itself -->
        <g :transform="`translate(${V / 2} ${V / 2})`" class="text-frost">
          <circle r="16" fill="none" stroke="currentColor" stroke-opacity="0.6" />
          <path d="M-26 0h18M8 0h18M0-26v18M0 8v18" stroke="currentColor" stroke-width="1.5" />
          <text y="44" text-anchor="middle" font-family="var(--font-mono)" font-size="16" fill="currentColor" class="label-halo">{{ POLES[pole].label }}</text>
        </g>

        <g v-if="showStations">
          <a v-for="p in pins" :key="p.id" :href="`#station-${p.id}`" class="group">
            <title>{{ p.name }}, {{ p.place }}</title>
            <circle :cx="p.x" :cy="p.y" r="14" fill="transparent" />
            <circle :cx="p.x" :cy="p.y" r="5" class="fill-aurora stroke-void transition-[r] group-hover:[r:7]" stroke-width="2" />
            <text :x="p.x + 11" :y="p.y + 5" font-size="16" font-family="var(--font-sans)" class="label-halo fill-ink font-medium">{{ p.name }}</text>
          </a>
        </g>
      </svg>

      <!-- porthole vignette -->
      <div class="pointer-events-none absolute inset-0" style="background: radial-gradient(closest-side, transparent 72%, rgb(4 11 20 / 0.55) 100%)" />

      <figcaption class="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4 sm:p-5">
        <span class="mono rounded-full bg-void/70 px-3 py-1 text-2xs text-dim backdrop-blur">
          NOAA-20 VIIRS · {{ LAYERS[layer].label }} · <span class="text-ink">{{ fmtDate(date) }}</span>
        </span>
        <span v-if="loading" class="mono rounded-full bg-void/70 px-3 py-1 text-2xs text-ice backdrop-blur">Receiving {{ loaded + failed }}/{{ cells.length }}</span>
        <span v-else-if="failed === cells.length" class="mono rounded-full bg-void/70 px-3 py-1 text-2xs text-ember backdrop-blur">No imagery for this day</span>
      </figcaption>

      <div class="pointer-events-none absolute inset-x-4 bottom-4 flex flex-col items-start gap-1 sm:inset-x-5 sm:bottom-5" aria-hidden="true">
        <span class="mono text-2xs text-dim">{{ fmtInt(scaleKm) }} km</span>
        <span class="h-1.5 border-x border-b border-frost/70" :style="{ width: `${scaleLen}%` }" />
      </div>
    </figure>

    <!-- controls -->
    <div class="flex flex-wrap items-center gap-2">
      <div class="flex flex-wrap gap-1.5" role="group" aria-label="Imagery layer">
        <button v-for="(l, id) in LAYERS" :key="id" type="button" class="btn" :aria-pressed="layer === id" @click="userLayer = id">{{ l.label }}</button>
      </div>
      <span class="mx-1 hidden h-5 w-px bg-line sm:block" />
      <div class="flex gap-1.5" role="group" aria-label="Zoom">
        <button v-for="(zz, id) in ZOOMS" :key="id" type="button" class="btn" :aria-pressed="zoom === id" @click="zoom = id">{{ zz.label }}</button>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <div class="flex items-center gap-1 rounded-full border border-line-strong bg-void/50 p-1">
        <button type="button" class="btn border-0 px-2.5 py-1.5" aria-label="Previous day" :disabled="date <= earliest" @click="step(-1)">‹</button>
        <input
          v-model="date"
          type="date"
          :min="earliest"
          :max="latest"
          aria-label="Imagery date"
          class="mono bg-transparent px-1 text-ink [color-scheme:dark] outline-none"
          @change="date = clampDate(date || latest)"
        />
        <button type="button" class="btn border-0 px-2.5 py-1.5" aria-label="Next day" :disabled="date >= latest" @click="step(1)">›</button>
      </div>
      <button v-for="j in jumps" :key="j.label" type="button" class="btn" @click="step(j.days)">{{ j.label }}</button>
      <button type="button" class="btn" :disabled="date === latest" @click="date = latest">Latest</button>
    </div>

    <div class="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <p class="max-w-xl text-sm text-dim">
        <span class="text-ink">{{ LAYERS[layer].label }}.</span> {{ LAYERS[layer].blurb }}
        <span v-if="userLayer === null" class="text-faint">Picked automatically for the season.</span>
      </p>
      <div class="flex flex-wrap gap-4 text-sm text-dim">
        <label class="flex cursor-pointer items-center gap-2"><input v-model="showGrid" type="checkbox" class="accent-ice" /> Grid</label>
        <label class="flex cursor-pointer items-center gap-2"><input v-model="showStations" type="checkbox" class="accent-ice" /> Stations</label>
        <label v-if="layer === 'truecolor'" class="flex cursor-pointer items-center gap-2" title="Fill gaps between satellite passes with NASA's Blue Marble reference image">
          <input v-model="fillGaps" type="checkbox" class="accent-ice" /> Fill gaps
        </label>
      </div>
    </div>
  </div>
</template>
