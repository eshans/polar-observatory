<script setup lang="ts">
import { scaleLinear } from 'd3-scale'
import { area, line } from 'd3-shape'

const { pole, info } = usePole()
const { data: ice, error, status } = useSeaIce()

const currentYear = computed(() => (ice.value ? Number(ice.value.latest.date.slice(0, 4)) : new Date().getUTCFullYear()))
const compareYear = ref<number | null>(null)
watch(pole, () => (compareYear.value = null))
const compare = computed(() => compareYear.value ?? currentYear.value - 1)
const yearOptions = computed(() => (ice.value ? Object.keys(ice.value.years).map(Number).filter((y) => y !== currentYear.value).sort((a, b) => b - a) : []))

// ---- size (measured in the browser; a sensible default for SSR)
const box = ref<HTMLElement>()
const width = useElementWidth(box, 900, 300)
const narrow = computed(() => width.value < 560)
const height = computed(() => Math.round(Math.min(440, Math.max(280, width.value * 0.5))))
const m = computed(() => ({ t: 14, r: narrow.value ? 12 : 104, b: 28, l: 40 }))

// ---- scales
const x = computed(() => scaleLinear().domain([0, 365]).range([m.value.l, width.value - m.value.r]))
const y = computed(() => {
  const d = ice.value
  if (!d) return scaleLinear().domain([0, 20]).range([height.value - m.value.b, m.value.t])
  let lo = Infinity
  let hi = -Infinity
  for (const s of Object.values(d.years)) for (const v of s) if (v != null) ((lo = Math.min(lo, v)), (hi = Math.max(hi, v)))
  return scaleLinear()
    .domain([Math.max(0, Math.floor(lo - 1)), Math.ceil(hi + 0.5)])
    .range([height.value - m.value.b, m.value.t])
    .nice()
})

const pathOf = (s: DoySeries | number[]) =>
  line<number | null>()
    .defined((v) => v != null)
    .x((_, i) => x.value(i))
    .y((v) => y.value(v!))(s) ?? ''

// 48 faint lines are a lot of SVG, so they are drawn in the browser only (keeps the HTML small)
const mounted = ref(false)
onMounted(() => (mounted.value = true))
const background = computed(() => {
  const d = ice.value
  if (!d || !mounted.value) return []
  const ys = Object.keys(d.years).map(Number).filter((yr) => yr !== currentYear.value && yr !== compare.value)
  const first = Math.min(...ys)
  const span = Math.max(1, currentYear.value - 1 - first)
  return ys.map((yr) => ({ yr, d: pathOf(d.years[yr]!), opacity: 0.05 + ((yr - first) / span) * 0.3 }))
})

const band = computed(() => {
  const c = ice.value?.climatology
  if (!c) return ''
  return (
    area<number>()
      .x((_, i) => x.value(i))
      .y0((_, i) => y.value(c.p10[i]!))
      .y1((_, i) => y.value(c.p90[i]!))(c.median) ?? ''
  )
})

const nowPath = computed(() => (ice.value ? pathOf(ice.value.years[currentYear.value]!) : ''))
const comparePath = computed(() => (ice.value?.years[compare.value] ? pathOf(ice.value.years[compare.value]!) : ''))
const medianPath = computed(() => (ice.value ? pathOf(ice.value.climatology.median) : ''))

const MONTHS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const yTicks = computed(() => y.value.ticks(narrow.value ? 4 : 6))

// ---- direct labels at the right edge, nudged apart so they never overlap
const endLabels = computed(() => {
  const d = ice.value
  if (!d || narrow.value) return []
  const last = (s: DoySeries | number[]) => {
    for (let i = s.length - 1; i >= 0; i--) if (s[i] != null) return { i, v: s[i]! }
    return null
  }
  const items = [
    { key: 'now', text: `${currentYear.value}`, cls: 'fill-series-now', pt: { i: d.rank.doy, v: d.latest.extent } },
    { key: 'cmp', text: `${compare.value}`, cls: 'fill-series-prev', pt: last(d.years[compare.value] ?? []) },
    { key: 'med', text: '1981–2010', cls: 'fill-dim', pt: last(d.climatology.median) },
  ]
    .filter((l) => l.pt)
    .map((l) => ({ ...l, x: x.value(l.pt!.i), y: y.value(l.pt!.v), ly: y.value(l.pt!.v) }))
    .sort((a, b) => a.ly - b.ly)
  for (let i = 1; i < items.length; i++) if (items[i]!.ly - items[i - 1]!.ly < 15) items[i]!.ly = items[i - 1]!.ly + 15
  return items
})

// ---- hover
const hoverDoy = ref<number | null>(null)
function onMove(ev: PointerEvent) {
  const svg = ev.currentTarget as SVGElement
  const r = svg.getBoundingClientRect()
  const px = ((ev.clientX - r.left) / r.width) * width.value
  hoverDoy.value = Math.min(365, Math.max(0, Math.round(x.value.invert(px))))
}
function onKey(ev: KeyboardEvent) {
  if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return
  ev.preventDefault()
  const start = hoverDoy.value ?? ice.value?.rank.doy ?? 0
  hoverDoy.value = Math.min(365, Math.max(0, start + (ev.key === 'ArrowLeft' ? -1 : 1) * (ev.shiftKey ? 7 : 1)))
}

const hover = computed(() => {
  const d = ice.value
  const i = hoverDoy.value
  if (!d || i === null) return null
  let low: { yr: number; v: number } | null = null
  for (const [yr, s] of Object.entries(d.years)) {
    const v = s[i]
    if (v != null && (!low || v < low.v)) low = { yr: Number(yr), v }
  }
  return {
    i,
    x: x.value(i),
    now: d.years[currentYear.value]?.[i] ?? null,
    cmp: d.years[compare.value]?.[i] ?? null,
    median: d.climatology.median[i] ?? null,
    low,
  }
})

// ---- headline numbers
const anomaly = computed(() => (ice.value ? ice.value.latest.extent - ice.value.climatology.median[ice.value.rank.doy]! : 0))
const anomalyPct = computed(() => (ice.value ? (anomaly.value / ice.value.climatology.median[ice.value.rank.doy]!) * 100 : 0))

const tableRows = computed(() => {
  const d = ice.value
  if (!d) return []
  return MONTHS.map((doy, k) => ({
    month: MONTH_NAMES[k],
    now: d.years[currentYear.value]?.[doy] ?? null,
    cmp: d.years[compare.value]?.[doy] ?? null,
    median: d.climatology.median[doy] ?? null,
  }))
})

const copy = computed(() =>
  pole.value === 'north'
    ? 'Arctic sea ice thickens through the polar night to a peak in March, then melts back to its minimum in September. Every faint line is one year since 1979; the most recent are the brightest.'
    : 'Antarctic sea ice does the opposite: it balloons around the continent to a peak in September and collapses to a minimum in February. Every faint line is one year since 1979; the most recent are the brightest.',
)
</script>

<template>
  <section id="sea-ice" class="wrap scroll-mt-28 pt-28" aria-labelledby="sea-ice-title">
    <SectionHead id="sea-ice-title" eyebrow="Sea ice pulse · NSIDC" :title="`How much of the ${info.region === 'Arctic' ? 'Arctic Ocean' : 'Southern Ocean'} is frozen`">
      {{ copy }}
    </SectionHead>

    <p v-if="error" class="error-note">{{ errorText(error) }}</p>

    <template v-else>
      <!-- headline stats -->
      <div v-reveal class="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        <div class="bg-void/85 p-5">
          <p class="mono text-2xs text-faint">Extent{{ ice ? ` · ${fmtDate(ice.latest.date)}` : '' }}</p>
          <p v-if="ice" class="stat-value mt-3">{{ fmtDec(ice.latest.extent, 2) }}<span class="ml-1 font-sans text-base text-dim">M km²</span></p>
          <span v-else class="skeleton mt-3 block h-10" />
        </div>
        <div class="bg-void/85 p-5">
          <p class="mono text-2xs text-faint">vs 1981–2010 median</p>
          <template v-if="ice">
            <p class="stat-value mt-3" :class="anomaly < 0 ? 'text-ember' : 'text-ice'">{{ fmtSigned(anomaly) }}<span class="ml-1 font-sans text-base text-dim">M km² ({{ fmtSigned(anomalyPct, 0) }}%)</span></p>
            <p class="mt-2 text-sm text-dim">{{ anomaly < 0 ? 'Missing' : 'Extra' }} ice {{ areaLike(anomaly) }}</p>
          </template>
          <span v-else class="skeleton mt-3 block h-10" />
        </div>
        <div class="bg-void/85 p-5">
          <p class="mono text-2xs text-faint">Rank for {{ ice ? fmtDoy(ice.rank.doy) : 'today' }}</p>
          <template v-if="ice">
            <p class="stat-value mt-3">{{ ordinal(ice.rank.position) }}<span class="ml-1 font-sans text-base text-dim">lowest</span></p>
            <p class="mt-2 text-sm text-dim">of {{ ice.rank.of }} years on record</p>
          </template>
          <span v-else class="skeleton mt-3 block h-10" />
        </div>
        <div class="bg-void/85 p-5">
          <p class="mono text-2xs text-faint">Past 7 days</p>
          <template v-if="ice && ice.latest.change7d !== null">
            <p class="stat-value mt-3">{{ fmtSigned(ice.latest.change7d) }}<span class="ml-1 font-sans text-base text-dim">M km²</span></p>
            <p class="mt-2 text-sm text-dim">{{ ice.latest.change7d >= 0 ? 'Freezing: about' : 'Melting: about' }} {{ fmtInt(Math.abs(ice.latest.change7d) * 1e6 / 7) }} km² a day</p>
          </template>
          <span v-else class="skeleton mt-3 block h-10" />
        </div>
      </div>

      <!-- chart -->
      <div v-reveal class="panel mt-4">
        <div class="mb-5 flex flex-wrap items-center justify-between gap-4">
          <ul class="flex flex-wrap gap-x-5 gap-y-2 text-sm text-dim" aria-label="Legend">
            <li class="flex items-center gap-2"><span class="h-[3px] w-5 rounded-full bg-series-now" />{{ currentYear }}</li>
            <li class="flex items-center gap-2"><span class="h-0.5 w-5 rounded-full bg-series-prev" />{{ compare }}</li>
            <li class="flex items-center gap-2"><span class="w-5 border-t-2 border-dashed border-dim" />1981–2010 median</li>
            <li class="flex items-center gap-2"><span class="h-3 w-5 rounded-sm bg-frost/10" />middle 80% of 1981–2010</li>
            <li class="flex items-center gap-2"><span class="h-0.5 w-8 rounded-full" style="background: linear-gradient(90deg, rgb(143 227 255 / 0.08), rgb(143 227 255 / 0.4))" />1979 → {{ currentYear - 1 }}</li>
          </ul>
          <label class="flex items-center gap-2 text-sm text-dim">
            Compare with
            <select v-model.number="compareYear" class="mono rounded-full border border-line-strong bg-void px-3 py-1.5 text-ink">
              <option :value="null">{{ currentYear - 1 }} (last year)</option>
              <option v-for="yr in yearOptions" :key="yr" :value="yr">
                {{ yr }}{{ ice && yr === ice.recordLow.year ? ' · record low' : '' }}{{ ice && yr === ice.recordHigh.year ? ' · record high' : '' }}
              </option>
            </select>
          </label>
        </div>

        <div ref="box" class="relative">
          <div v-if="!ice && status === 'pending'" class="skeleton" :style="{ height: `${height}px` }" />
          <svg
            v-else-if="ice"
            :viewBox="`0 0 ${width} ${height}`"
            :width="width"
            :height="height"
            class="block max-w-full touch-pan-y outline-none"
            tabindex="0"
            role="img"
            :aria-label="`Daily ${info.region} sea ice extent: ${currentYear} compared with ${compare} and every year since 1979. Use left and right arrow keys to read values.`"
            @pointermove="onMove"
            @pointerleave="hoverDoy = null"
            @keydown="onKey"
            @blur="hoverDoy = null"
          >
            <!-- grid -->
            <g class="text-faint" font-family="var(--font-mono)" font-size="10">
              <text :x="m.l + 4" :y="m.t + 2" dominant-baseline="hanging" fill="currentColor">million km²</text>
              <g v-for="t in yTicks" :key="t">
                <line :x1="m.l" :x2="width - m.r" :y1="y(t)" :y2="y(t)" stroke="currentColor" stroke-opacity="0.18" />
                <text :x="m.l - 8" :y="y(t)" text-anchor="end" dominant-baseline="middle" fill="currentColor">{{ t }}</text>
              </g>
              <g v-for="(d, k) in MONTHS" :key="d">
                <line :x1="x(d)" :x2="x(d)" :y1="height - m.b" :y2="height - m.b + 4" stroke="currentColor" />
                <text v-if="!narrow || k % 2 === 0" :x="x(d) + 3" :y="height - m.b + 16" fill="currentColor">{{ MONTH_NAMES[k] }}</text>
              </g>
            </g>

            <path :d="band" class="fill-frost/8" />
            <g fill="none" stroke-linejoin="round" stroke-linecap="round">
              <path v-for="b in background" :key="b.yr" :d="b.d" stroke="#8fe3ff" :stroke-opacity="b.opacity" stroke-width="1" />
              <path :d="medianPath" class="stroke-dim" stroke-width="1.5" stroke-dasharray="5 4" />
              <path :d="comparePath" class="stroke-series-prev" stroke-width="2" />
              <path :d="nowPath" class="stroke-void" stroke-width="6" />
              <path :d="nowPath" class="stroke-series-now" stroke-width="2.5" />
            </g>
            <circle :cx="x(ice.rank.doy)" :cy="y(ice.latest.extent)" r="5" class="fill-series-now stroke-void" stroke-width="2" />

            <g font-family="var(--font-mono)" font-size="11">
              <g v-for="l in endLabels" :key="l.key">
                <line v-if="Math.abs(l.ly - l.y) > 2" :x1="l.x + 4" :x2="width - m.r + 6" :y1="l.y" :y2="l.ly" class="stroke-faint" />
                <text :x="width - m.r + 10" :y="l.ly" dominant-baseline="middle" class="label-halo fill-ink">
                  <tspan :class="l.cls">●</tspan> {{ l.text }}
                </text>
              </g>
            </g>

            <!-- crosshair -->
            <g v-if="hover" pointer-events="none">
              <line :x1="hover.x" :x2="hover.x" :y1="m.t" :y2="height - m.b" class="stroke-frost/40" />
              <circle v-if="hover.cmp !== null" :cx="hover.x" :cy="y(hover.cmp)" r="4" class="fill-series-prev stroke-void" stroke-width="2" />
              <circle v-if="hover.now !== null" :cx="hover.x" :cy="y(hover.now)" r="5" class="fill-series-now stroke-void" stroke-width="2" />
            </g>
            <rect :x="m.l" :y="m.t" :width="width - m.l - m.r" :height="height - m.t - m.b" fill="transparent" />
          </svg>

          <div
            v-if="hover"
            class="pointer-events-none absolute top-2 z-10 min-w-48 rounded-xl border border-line-strong bg-void/92 p-3 text-sm shadow-xl backdrop-blur"
            :style="hover.x > width / 2 ? { right: `${width - hover.x + 14}px` } : { left: `${hover.x + 14}px` }"
          >
            <p class="mono mb-2 text-2xs text-faint">{{ fmtDoy(hover.i) }}</p>
            <dl class="grid grid-cols-[auto_auto] gap-x-4 gap-y-1 tabular-nums">
              <template v-if="hover.now !== null"><dt class="flex items-center gap-2 text-dim"><span class="size-2 rounded-full bg-series-now" />{{ currentYear }}</dt><dd class="text-right text-ink">{{ fmtDec(hover.now, 2) }}</dd></template>
              <template v-if="hover.cmp !== null"><dt class="flex items-center gap-2 text-dim"><span class="size-2 rounded-full bg-series-prev" />{{ compare }}</dt><dd class="text-right text-ink">{{ fmtDec(hover.cmp, 2) }}</dd></template>
              <template v-if="hover.median !== null"><dt class="text-dim">Median</dt><dd class="text-right text-ink">{{ fmtDec(hover.median, 2) }}</dd></template>
              <template v-if="hover.low"><dt class="text-dim">Lowest ({{ hover.low.yr }})</dt><dd class="text-right text-ink">{{ fmtDec(hover.low.v, 2) }}</dd></template>
            </dl>
            <p class="mono mt-2 text-2xs text-faint">million km²</p>
          </div>
        </div>

        <div class="mt-5 flex flex-wrap items-baseline justify-between gap-4 border-t border-line pt-4 text-sm text-dim">
          <p v-if="ice">
            Record low <span class="text-ink">{{ fmtDec(ice.recordLow.extent, 2) }} M km²</span> on {{ fmtDate(ice.recordLow.date) }} ·
            record high <span class="text-ink">{{ fmtDec(ice.recordHigh.extent, 2) }} M km²</span> on {{ fmtDate(ice.recordHigh.date) }}
          </p>
          <details class="group">
            <summary class="mono cursor-pointer text-2xs text-faint hover:text-ice">Data table</summary>
            <table class="mt-3 w-full min-w-72 text-right tabular-nums">
              <thead class="mono text-2xs text-faint">
                <tr><th class="py-1 text-left font-normal">1st of</th><th class="font-normal">{{ currentYear }}</th><th class="font-normal">{{ compare }}</th><th class="font-normal">Median</th></tr>
              </thead>
              <tbody>
                <tr v-for="r in tableRows" :key="r.month" class="border-t border-line">
                  <td class="py-1 text-left text-dim">{{ r.month }}</td>
                  <td>{{ r.now === null ? '—' : fmtDec(r.now, 2) }}</td>
                  <td>{{ r.cmp === null ? '—' : fmtDec(r.cmp, 2) }}</td>
                  <td>{{ r.median === null ? '—' : fmtDec(r.median, 2) }}</td>
                </tr>
              </tbody>
            </table>
          </details>
        </div>
      </div>
    </template>
  </section>
</template>
