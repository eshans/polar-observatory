<script setup lang="ts">
// Two stacked charts on one shared time axis (never a dual axis): the ice core's climate signal, then CO2.
import { scaleLinear } from 'd3-scale'
import { line } from 'd3-shape'

const { pole } = usePole()
const { data, error } = useDeepTime()

const box = ref<HTMLElement>()
const width = useElementWidth(box, 900, 300)
const narrow = computed(() => width.value < 560)
const M = computed(() => ({ l: 44, r: narrow.value ? 12 : 120 }))
const H1 = 220
const H2 = 170
const PAD = { t: 18, b: 10 }

const oldest = computed(() => data.value?.climate.at(-1)?.[0] ?? 800_000)
const x = computed(() => scaleLinear().domain([oldest.value, 0]).range([M.value.l, width.value - M.value.r]))

const extent = (pts: [number, number][], extra: number[] = []) => {
  let lo = Infinity
  let hi = -Infinity
  for (const [, v] of pts) ((lo = Math.min(lo, v)), (hi = Math.max(hi, v)))
  for (const v of extra) ((lo = Math.min(lo, v)), (hi = Math.max(hi, v)))
  return [lo, hi] as const
}

const y1 = computed(() => {
  const [lo, hi] = data.value ? extent(data.value.climate) : [0, 1]
  return scaleLinear().domain([lo, hi]).range([H1 - PAD.b, PAD.t]).nice()
})
const y2 = computed(() => {
  const [lo, hi] = data.value ? extent(data.value.co2, data.value.co2Now ? [data.value.co2Now.ppm] : []) : [180, 430]
  return scaleLinear().domain([lo, hi]).range([H2 - PAD.b, PAD.t]).nice()
})

const climatePath = computed(() => (data.value ? line<[number, number]>().x((p) => x.value(p[0])).y((p) => y1.value(p[1]))(data.value.climate) ?? '' : ''))
const co2Path = computed(() =>
  data.value
    ? line<[number, number]>().x((p) => x.value(Math.max(0, p[0]))).y((p) => y2.value(p[1]))(data.value.co2.filter((p) => p[0] <= oldest.value)) ?? ''
    : '',
)

/** Highest CO2 in the ice core before the industrial era (older than 1800). */
const preIndustrialMax = computed(() => (data.value ? Math.max(...data.value.co2.filter((p) => p[0] > 200).map((p) => p[1])) : null))

const isTemp = computed(() => data.value?.climateKind !== 'd18o')
const fmtAge = (a: number) => (a < 1000 ? 'Today' : a < 10_000 ? `${fmtDec(a / 1000, 1)}k years ago` : `${fmtInt(Math.round(a / 1000))}k years ago`)

const EVENTS = computed(() =>
  pole.value === 'south'
    ? [
        { age: 21_000, label: 'Last ice age peak' },
        { age: 125_000, label: 'Last interglacial' },
        { age: 405_000, label: 'Long warm spell (MIS 11)' },
        { age: 640_000, label: 'Glacial cycles grow stronger' },
      ]
    : [
        { age: 11_700, label: 'Holocene begins' },
        { age: 21_000, label: 'Ice age peak' },
        { age: 45_000, label: 'Abrupt warmings (D–O events)' },
        { age: 118_000, label: 'End of last interglacial' },
      ],
)

const xTicks = computed(() => {
  const step = oldest.value > 300_000 ? 100_000 : 20_000
  const out: number[] = []
  for (let a = 0; a <= oldest.value; a += step) out.push(a)
  return out
})

// ---- hover (shared crosshair)
const hoverAge = ref<number | null>(null)
function onMove(ev: PointerEvent) {
  const r = (ev.currentTarget as SVGElement).getBoundingClientRect()
  const px = ((ev.clientX - r.left) / r.width) * width.value
  const a = x.value.invert(px)
  hoverAge.value = a >= 0 && a <= oldest.value ? a : null
}
const nearest = (pts: [number, number][], age: number) => {
  let lo = 0
  let hi = pts.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (pts[mid]![0] < age) lo = mid
    else hi = mid
  }
  return Math.abs(pts[lo]![0] - age) < Math.abs(pts[hi]![0] - age) ? pts[lo]! : pts[hi]!
}
const hover = computed(() => {
  const d = data.value
  const a = hoverAge.value
  if (!d || a === null) return null
  const c = nearest(d.climate, a)
  const k = nearest(d.co2, a)
  return { age: a, x: x.value(a), climate: c[1], co2: k[1] }
})

const copy = computed(() =>
  pole.value === 'south'
    ? 'Snow falling on Antarctica traps air as it turns to ice. The EPICA Dome C core, drilled 3.2 km down, holds 800,000 years of it: eight ice-age cycles, with temperature and carbon dioxide rising and falling together.'
    : 'Greenland’s ice keeps a 123,000-year diary. The NGRIP core records the last warm interglacial, the long ice age with its sudden flickers of warmth, and the unusually calm 11,700 years in which farming and cities appeared.',
)
</script>

<template>
  <section id="deep-time" class="wrap scroll-mt-28 pt-28" aria-labelledby="deep-time-title">
    <SectionHead id="deep-time-title" eyebrow="Deep time · ice cores" :title="pole === 'south' ? '800,000 years in the ice' : '123,000 years in the ice'">
      {{ copy }}
    </SectionHead>

    <p v-if="error" class="error-note">{{ errorText(error) }}</p>

    <div v-else v-reveal class="panel">
      <div ref="box" class="relative">
        <div v-if="!data" class="skeleton" :style="{ height: `${H1 + H2 + 60}px` }" />
        <template v-else-if="data">
          <!-- climate -->
          <h3 class="mono mb-1 text-2xs text-faint">
            {{ isTemp ? 'Antarctic temperature, °C relative to the last 1,000 years' : 'Greenland δ¹⁸O, ‰ (an isotope thermometer: higher = warmer)' }}
          </h3>
          <svg :viewBox="`0 0 ${width} ${H1}`" :width="width" :height="H1" class="block max-w-full touch-pan-y" role="img"
            :aria-label="isTemp ? 'Antarctic temperature over 800,000 years from the EPICA Dome C ice core' : 'Greenland oxygen isotope record over 123,000 years from the NGRIP ice core'"
            @pointermove="onMove" @pointerleave="hoverAge = null">
            <g font-family="var(--font-mono)" font-size="10" class="fill-faint">
              <g v-for="t in y1.ticks(5)" :key="t">
                <line :x1="M.l" :x2="width - M.r" :y1="y1(t)" :y2="y1(t)" class="stroke-line" />
                <text :x="M.l - 8" :y="y1(t)" text-anchor="end" dominant-baseline="middle">{{ t > 0 && isTemp ? `+${t}` : t }}</text>
              </g>
            </g>
            <line v-if="isTemp" :x1="M.l" :x2="width - M.r" :y1="y1(0)" :y2="y1(0)" class="stroke-dim" stroke-dasharray="4 4" />
            <g font-family="var(--font-mono)" font-size="10">
              <g v-for="e in EVENTS" :key="e.age">
                <line :x1="x(e.age)" :x2="x(e.age)" :y1="PAD.t - 6" :y2="H1 - PAD.b" class="stroke-frost/20" />
                <text v-if="!narrow" :x="x(e.age) + 4" :y="PAD.t - 2" class="label-halo fill-dim">{{ e.label }}</text>
              </g>
            </g>
            <path :d="climatePath" fill="none" class="stroke-ice" stroke-width="1.5" stroke-linejoin="round" />
            <text v-if="!narrow" :x="width - M.r + 10" :y="y1(data.climate[0]![1])" dominant-baseline="middle" font-family="var(--font-mono)" font-size="11" class="fill-ink">
              {{ isTemp ? 'warm now' : 'Holocene' }}
            </text>
            <line v-if="hover" :x1="hover.x" :x2="hover.x" :y1="PAD.t" :y2="H1 - PAD.b" class="stroke-frost/50" />
            <circle v-if="hover" :cx="hover.x" :cy="y1(hover.climate)" r="4" class="fill-ice stroke-void" stroke-width="2" />
          </svg>

          <!-- CO2 -->
          <h3 class="mono mt-4 mb-1 text-2xs text-faint">Atmospheric CO₂, parts per million (from air bubbles in Antarctic ice)</h3>
          <svg :viewBox="`0 0 ${width} ${H2 + 24}`" :width="width" :height="H2 + 24" class="block max-w-full touch-pan-y" role="img"
            :aria-label="`Carbon dioxide from ice cores${data.co2Now ? `, compared with today's ${fmtDec(data.co2Now.ppm, 0)} ppm` : ''}`"
            @pointermove="onMove" @pointerleave="hoverAge = null">
            <g font-family="var(--font-mono)" font-size="10" class="fill-faint">
              <g v-for="t in y2.ticks(4)" :key="t">
                <line :x1="M.l" :x2="width - M.r" :y1="y2(t)" :y2="y2(t)" class="stroke-line" />
                <text :x="M.l - 8" :y="y2(t)" text-anchor="end" dominant-baseline="middle">{{ t }}</text>
              </g>
              <g v-for="a in xTicks" :key="a">
                <line :x1="x(a)" :x2="x(a)" :y1="H2 - PAD.b" :y2="H2 - PAD.b + 5" class="stroke-faint" />
                <text :x="x(a)" :y="H2 + 10" :text-anchor="a === 0 ? 'end' : 'middle'">{{ a === 0 ? 'now' : narrow && (a / xTicks[1]!) % 2 ? '' : `${a / 1000}k` }}</text>
              </g>
              <text :x="M.l" :y="H2 + 22" class="fill-faint">thousand years ago</text>
            </g>
            <g v-if="preIndustrialMax">
              <line :x1="M.l" :x2="width - M.r" :y1="y2(preIndustrialMax)" :y2="y2(preIndustrialMax)" class="stroke-dim" stroke-dasharray="2 4" />
              <text v-if="!narrow" :x="width - M.r + 10" :y="y2(preIndustrialMax)" dominant-baseline="middle" font-family="var(--font-mono)" font-size="10" class="fill-dim">
                ice-core max {{ Math.round(preIndustrialMax) }}
              </text>
            </g>
            <path :d="co2Path" fill="none" class="stroke-series-now" stroke-width="1.5" stroke-linejoin="round" />
            <g v-if="data.co2Now">
              <line :x1="x(0)" :x2="x(0)" :y1="y2(data.co2[0]![1])" :y2="y2(data.co2Now.ppm)" class="stroke-series-now" stroke-width="2.5" />
              <circle :cx="x(0)" :cy="y2(data.co2Now.ppm)" r="5" class="fill-series-now stroke-void" stroke-width="2" />
              <text v-if="!narrow" :x="width - M.r + 10" :y="y2(data.co2Now.ppm)" dominant-baseline="middle" font-family="var(--font-mono)" font-size="11" class="fill-ink">
                {{ fmtDec(data.co2Now.ppm, 0) }} ppm today
              </text>
            </g>
            <line v-if="hover" :x1="hover.x" :x2="hover.x" :y1="PAD.t" :y2="H2 - PAD.b" class="stroke-frost/50" />
            <circle v-if="hover" :cx="hover.x" :cy="y2(hover.co2)" r="4" class="fill-series-now stroke-void" stroke-width="2" />
          </svg>

          <div
            v-if="hover"
            class="pointer-events-none absolute top-6 z-10 min-w-52 rounded-xl border border-line-strong bg-void/92 p-3 text-sm shadow-xl backdrop-blur"
            :style="hover.x > width / 2 ? { right: `${width - hover.x + 14}px` } : { left: `${hover.x + 14}px` }"
          >
            <p class="mono mb-2 text-2xs text-faint">{{ fmtAge(hover.age) }}</p>
            <dl class="grid grid-cols-[auto_auto] gap-x-4 gap-y-1 tabular-nums">
              <dt class="flex items-center gap-2 text-dim"><span class="size-2 rounded-full bg-ice" />{{ isTemp ? 'Temperature' : 'δ¹⁸O' }}</dt>
              <dd class="text-right text-ink">{{ isTemp ? `${fmtSigned(hover.climate, 1)} °C` : `${fmtDec(hover.climate, 1)} ‰` }}</dd>
              <dt class="flex items-center gap-2 text-dim"><span class="size-2 rounded-full bg-series-now" />CO₂</dt>
              <dd class="text-right text-ink">{{ fmtInt(hover.co2) }} ppm</dd>
            </dl>
          </div>
        </template>
      </div>

      <p v-if="data?.co2Now && preIndustrialMax" class="mt-5 border-t border-line pt-4 text-sm text-dim">
        In {{ isTemp ? '800,000' : '123,000' }} years of ice, CO₂ never rose above <span class="text-ink">{{ Math.round(preIndustrialMax) }} ppm</span>.
        Mauna Loa measured <span class="text-ink">{{ fmtDec(data.co2Now.ppm, 1) }} ppm</span> in {{ fmtDate(`${data.co2Now.date}-15`).replace(/ \d+,/, '') }}.
        <span class="text-faint">Sources: {{ isTemp ? 'EPICA Dome C, Jouzel et al. 2007' : 'NGRIP members 2004' }}; CO₂ composite, Bereiter et al. 2015 (NOAA Paleoclimatology); Mauna Loa, NOAA GML.</span>
      </p>
    </div>
  </section>
</template>
