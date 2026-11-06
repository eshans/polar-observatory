<script setup lang="ts">
// A year of light at one place: each column is a day, each row a quarter hour of local solar time,
// coloured by how high the sun is. Computed in the browser.
const { pole, info } = usePole()
const now = useNow()

const PHASES = [
  { key: 'night', label: 'Night', min: -90, color: '#0b1b2e' },
  { key: 'astro', label: 'Astronomical twilight', min: -18, color: '#163a5c' },
  { key: 'nautical', label: 'Nautical twilight', min: -12, color: '#25608f' },
  { key: 'civil', label: 'Civil twilight', min: -6, color: '#4f93c2' },
  { key: 'day', label: 'Daylight', min: -0.833, color: '#cdeefc' },
] as const
const phaseIndex = (alt: number) => (alt > -0.833 ? 4 : alt > -6 ? 3 : alt > -12 ? 2 : alt > -18 ? 1 : 0)

const places = computed(() => {
  const s = pole.value === 'north' ? 1 : -1
  return [
    { id: 'pole', name: `The pole (${info.value.label})`, lat: 90 * s },
    ...STATIONS[pole.value].filter((st) => Math.abs(st.lat) < 89.9).map((st) => ({ id: st.id, name: st.name, lat: st.lat })),
    { id: 'circle', name: pole.value === 'north' ? 'Arctic Circle (66.6°N)' : 'Antarctic Circle (66.6°S)', lat: 66.56 * s },
  ]
})
const placeId = ref('pole')
watch(pole, () => (placeId.value = 'pole'))
const place = computed(() => places.value.find((p) => p.id === placeId.value) ?? places.value[0]!)

const DAYS = 365
const STEPS = 96 // 15-minute rows

/** phase index per [day][step] plus per-day stats */
const grid = computed(() => {
  const lat = place.value.lat
  const cells = new Uint8Array(DAYS * STEPS)
  const dayLength: number[] = []
  let midnightSun = 0
  let polarNight = 0
  for (let d = 0; d < DAYS; d++) {
    let up = 0
    for (let s = 0; s < STEPS; s++) {
      const p = phaseIndex(solarAltitudeFast(lat, d, (s + 0.5) / 4))
      cells[d * STEPS + s] = p
      if (p === 4) up++
    }
    dayLength.push(up / 4)
    if (up === STEPS) midnightSun++
    if (up === 0) polarNight++
  }
  return { cells, dayLength, midnightSun, polarNight }
})

const todayDoy = computed(() => {
  if (!now.value) return null
  const d = now.value
  return Math.min(DAYS - 1, Math.floor((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86_400_000))
})

// next change between 24 h light / darkness / ordinary days, looking ahead from today
const nextShift = computed(() => {
  const t = todayDoy.value
  if (t === null) return null
  const kind = (h: number) => (h >= 24 ? 'sun' : h <= 0 ? 'dark' : 'mixed')
  const k0 = kind(grid.value.dayLength[t]!)
  for (let i = 1; i < DAYS; i++) {
    const d = (t + i) % DAYS
    const k = kind(grid.value.dayLength[d]!)
    if (k !== k0) {
      const label = k === 'sun' ? 'Midnight sun begins' : k === 'dark' ? 'Polar night begins' : k0 === 'sun' ? 'Sun sets again' : 'Sun rises again'
      return { label, doy: d, inDays: i }
    }
  }
  return null
})

// ---- canvas
const box = ref<HTMLElement>()
const canvas = ref<HTMLCanvasElement>()
const width = useElementWidth(box, 900, 300)
const H = 300
const M = { t: 8, r: 8, b: 26, l: 36 }

function draw() {
  const el = canvas.value
  if (!el) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  el.width = Math.round(width.value * dpr)
  el.height = Math.round(H * dpr)
  const ctx = el.getContext('2d')!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width.value, H)
  const pw = width.value - M.l - M.r
  const ph = H - M.t - M.b
  const cw = pw / DAYS
  const ch = ph / STEPS
  const { cells } = grid.value
  for (let d = 0; d < DAYS; d++) {
    for (let s = 0; s < STEPS; s++) {
      ctx.fillStyle = PHASES[cells[d * STEPS + s]!]!.color
      // rows run top = midnight → bottom = midnight, noon in the middle
      ctx.fillRect(M.l + d * cw, M.t + s * ch, cw + 0.6, ch + 0.6)
    }
  }
}

onMounted(() => draw())
watch([grid, width], () => nextTick(draw))

const MONTHS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const xOf = (d: number) => M.l + (d / DAYS) * (width.value - M.l - M.r)
const yOf = (hour: number) => M.t + (hour / 24) * (H - M.t - M.b)

const hover = ref<{ d: number; s: number } | null>(null)
function onMove(ev: PointerEvent) {
  const r = (ev.currentTarget as HTMLElement).getBoundingClientRect()
  const px = ((ev.clientX - r.left) / r.width) * width.value
  const py = ev.clientY - r.top
  const d = Math.floor(((px - M.l) / (width.value - M.l - M.r)) * DAYS)
  const s = Math.floor(((py - M.t) / (H - M.t - M.b)) * STEPS)
  hover.value = d >= 0 && d < DAYS && s >= 0 && s < STEPS ? { d, s } : null
}
const fmtHours = (h: number) => (h >= 24 ? '24 h' : h <= 0 ? '0 h' : `${Math.floor(h)} h ${String(Math.round((h % 1) * 60)).padStart(2, '0')} m`)
const fmtClock = (s: number) => `${String(Math.floor(s / 4)).padStart(2, '0')}:${String((s % 4) * 15).padStart(2, '0')}`
</script>

<template>
  <section id="light" class="wrap scroll-mt-28 pt-28" aria-labelledby="light-title">
    <div class="flex flex-wrap items-end justify-between gap-6">
      <SectionHead id="light-title" eyebrow="Polar light calendar" title="A year of light, hour by hour">
        Each column is one day; each row is a quarter hour, midnight at the top and bottom and solar noon in the middle.
        At the pole there is one sunrise and one sunset a year; move away and ordinary days creep in.
      </SectionHead>
      <label class="mb-8 flex items-center gap-2 text-sm text-dim">
        Place
        <select v-model="placeId" class="mono rounded-full border border-line-strong bg-void px-3 py-1.5 text-ink">
          <option v-for="p in places" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </label>
    </div>

    <div v-reveal class="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
      <div class="bg-void/85 p-5">
        <p class="mono text-2xs text-faint">Daylight today</p>
        <p class="stat-value mt-3"><ClientOnly>{{ todayDoy !== null ? fmtHours(grid.dayLength[todayDoy]!) : '—' }}<template #fallback>—</template></ClientOnly></p>
      </div>
      <div class="bg-void/85 p-5">
        <p class="mono text-2xs text-faint">Days of midnight sun</p>
        <p class="stat-value mt-3">{{ grid.midnightSun }}</p>
      </div>
      <div class="bg-void/85 p-5">
        <p class="mono text-2xs text-faint">Days without sunrise</p>
        <p class="stat-value mt-3">{{ grid.polarNight }}</p>
      </div>
      <div class="bg-void/85 p-5">
        <p class="mono text-2xs text-faint">Next turning point</p>
        <ClientOnly>
          <template v-if="nextShift">
            <p class="stat-value mt-3">{{ nextShift.inDays }}<span class="ml-1 font-sans text-base text-dim">days</span></p>
            <p class="mt-2 text-sm text-dim">{{ nextShift.label }} · {{ fmtDoy(nextShift.doy) }}</p>
          </template>
          <p v-else class="mt-3 text-sm text-dim">Sun rises and sets every day of the year</p>
        </ClientOnly>
      </div>
    </div>

    <div v-reveal class="panel mt-4">
      <ul class="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-dim" aria-label="Legend">
        <li v-for="p in [...PHASES].reverse()" :key="p.key" class="flex items-center gap-2"><span class="size-3 rounded-sm border border-line" :style="{ background: p.color }" />{{ p.label }}</li>
      </ul>
      <div ref="box" class="relative" @pointermove="onMove" @pointerleave="hover = null">
        <canvas ref="canvas" :style="{ width: `${width}px`, height: `${H}px` }" class="block max-w-full" role="img" :aria-label="`Daylight and twilight through the year at ${place.name}: ${grid.midnightSun} days of midnight sun and ${grid.polarNight} days without sunrise.`" />
        <svg :viewBox="`0 0 ${width} ${H}`" class="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
          <g font-family="var(--font-mono)" font-size="10" class="fill-faint">
            <text v-for="h in [0, 6, 12, 18, 24]" :key="h" :x="M.l - 6" :y="yOf(h)" text-anchor="end" dominant-baseline="middle">{{ String(h).padStart(2, '0') }}</text>
            <text v-for="(d, k) in MONTHS" :key="d" :x="xOf(d) + 2" :y="H - 8">{{ width < 560 && k % 2 ? '' : MONTH_NAMES[k] }}</text>
          </g>
          <line :x1="M.l" :x2="width - M.r" :y1="yOf(12)" :y2="yOf(12)" stroke="rgb(4 11 20 / 0.35)" stroke-dasharray="3 4" />
          <g v-if="todayDoy !== null">
            <line :x1="xOf(todayDoy + 0.5)" :x2="xOf(todayDoy + 0.5)" :y1="M.t - 4" :y2="H - M.b + 4" class="stroke-series-now" stroke-width="2" />
            <text :x="xOf(todayDoy + 0.5)" :y="H - M.b + 16" text-anchor="middle" font-family="var(--font-mono)" font-size="10" class="label-halo fill-ink">today</text>
          </g>
          <g v-if="hover">
            <rect :x="xOf(hover.d)" :y="M.t" :width="Math.max(1, xOf(1) - xOf(0))" :height="H - M.t - M.b" fill="none" class="stroke-frost" />
          </g>
        </svg>
        <div
          v-if="hover"
          class="pointer-events-none absolute top-2 z-10 rounded-xl border border-line-strong bg-void/92 p-3 text-sm shadow-xl backdrop-blur"
          :style="xOf(hover.d) > width / 2 ? { right: `${width - xOf(hover.d) + 12}px` } : { left: `${xOf(hover.d) + 12}px` }"
        >
          <p class="mono text-2xs text-faint">{{ fmtDoy(hover.d) }} · {{ fmtClock(hover.s) }} solar time</p>
          <p class="mt-1 text-ink">{{ PHASES[grid.cells[hover.d * STEPS + hover.s]!]!.label }}</p>
          <p class="text-dim">Daylight that day: {{ fmtHours(grid.dayLength[hover.d]!) }}</p>
        </div>
      </div>
      <p class="mt-3 text-xs text-faint">Local solar time (the sun is highest at 12:00). Clocks at polar stations often run hours away from solar time.</p>
    </div>
  </section>
</template>
