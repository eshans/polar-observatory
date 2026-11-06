<script setup lang="ts">
const { pole, info } = usePole()
const { data, error } = useAurora()
const now = useNow()

const KP_LABEL = ['Quiet', 'Quiet', 'Quiet', 'Unsettled', 'Active', 'G1 · minor storm', 'G2 · moderate storm', 'G3 · strong storm', 'G4 · severe storm', 'G5 · extreme storm']
const kpLabel = (kp: number) => KP_LABEL[Math.min(9, Math.floor(kp))]!

const kpNow = computed(() => {
  const list = data.value?.kp.filter((k) => !k.predicted)
  return list?.length ? list[list.length - 1]! : null
})
const kpPeak = computed(() => {
  const list = data.value?.kp.filter((k) => k.predicted)
  return list?.length ? list.reduce((a, b) => (b.kp > a.kp ? b : a)) : null
})

const markers = computed<MapMarker[]>(() =>
  (data.value?.spots ?? []).map((s) => ({ id: s.name, lat: s.lat, lon: s.lon, label: s.name.split(',')[0], title: `${s.name}: ${s.chance}% chance overhead`, r: 5, tone: 'frost' as const })),
)

const dark = (lat: number, lon: number) => (now.value ? sunAltitude(lat, lon, now.value) < -6 : null)

// ---- Kp bar chart
const box = ref<HTMLElement>()
const width = useElementWidth(box, 600, 280)
const H = 190
const M = { t: 12, r: 8, b: 26, l: 24 }
const bars = computed(() => {
  const list = data.value?.kp ?? []
  const n = list.length || 1
  const slot = (width.value - M.l - M.r) / n
  const y = (kp: number) => H - M.b - (kp / 9) * (H - M.t - M.b)
  return list.map((k, i) => ({
    ...k,
    x: M.l + i * slot + 1,
    w: Math.max(2, slot - 2),
    y: y(Math.max(k.kp, 0.15)),
    h: H - M.b - y(Math.max(k.kp, 0.15)),
    day: new Date(k.time).getUTCHours() === 0 ? fmtWeekday(k.time) : null,
  }))
})
const kpY = (kp: number) => H - M.b - (kp / 9) * (H - M.t - M.b)
const nowX = computed(() => {
  const b = bars.value
  if (!b.length || !now.value) return null
  const t = now.value.getTime()
  const i = b.findIndex((k) => Date.parse(k.time) > t)
  if (i <= 0) return null
  const prev = b[i - 1]!
  return prev.x + ((t - Date.parse(prev.time)) / (3 * 3_600_000)) * (prev.w + 2)
})
const hoverBar = ref<number | null>(null)
</script>

<template>
  <section id="aurora" class="wrap scroll-mt-28 pt-28" aria-labelledby="aurora-title">
    <SectionHead id="aurora-title" eyebrow="Aurora oval · NOAA SWPC" tone="aurora" :title="pole === 'north' ? 'Where the northern lights are now' : 'Where the southern lights are now'">
      The aurora forms a ring around each magnetic pole where solar wind particles hit the upper atmosphere. Brighter green means a higher chance of seeing it overhead in the next hour.
      The shading shows night, deepening through twilight.
    </SectionHead>

    <p v-if="error" class="error-note">{{ errorText(error) }}</p>

    <div v-else class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div v-reveal class="panel p-3 sm:p-4">
        <div v-if="!data" class="skeleton aspect-square w-full rounded-full" />
        <ClientOnly v-else>
          <PolarMap
            :pole="pole"
            :max-colat="pole === 'north' ? 42 : 52"
            :night="now"
            :cells="data?.cells ?? null"
            :cell-max="35"
            :markers="markers"
            :label="`Aurora forecast over the ${info.region}`"
          />
          <template #fallback><div class="skeleton aspect-square w-full rounded-full" /></template>
        </ClientOnly>
        <p v-if="data" class="mono mt-3 px-2 text-2xs text-faint">OVATION model · valid {{ fmtDateTime(data.forecast) }}</p>
      </div>

      <div class="flex flex-col gap-4">
        <div v-reveal class="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
          <div class="bg-void/85 p-5">
            <p class="mono text-2xs text-faint">Kp index now</p>
            <template v-if="kpNow">
              <p class="stat-value mt-3" :class="kpNow.kp >= 5 && 'text-ember'">{{ fmtDec(kpNow.kp, 1) }}<span class="ml-1 font-sans text-base text-dim">/ 9</span></p>
              <p class="mt-2 text-sm text-dim">{{ kpLabel(kpNow.kp) }}</p>
            </template>
            <span v-else class="skeleton mt-3 block h-10" />
          </div>
          <div class="bg-void/85 p-5">
            <p class="mono text-2xs text-faint">3-day forecast peak</p>
            <template v-if="kpPeak">
              <p class="stat-value mt-3" :class="kpPeak.kp >= 5 && 'text-ember'">{{ fmtDec(kpPeak.kp, 1) }}<span class="ml-1 font-sans text-base text-dim">/ 9</span></p>
              <p class="mt-2 text-sm text-dim">{{ kpLabel(kpPeak.kp) }} · {{ fmtDateTime(kpPeak.time) }}</p>
            </template>
            <span v-else class="skeleton mt-3 block h-10" />
          </div>
        </div>

        <div v-reveal class="panel">
          <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 class="mono text-2xs text-faint">Geomagnetic activity (Kp), every 3 hours</h3>
            <ul class="flex gap-4 text-xs text-dim" aria-label="Legend">
              <li class="flex items-center gap-1.5"><span class="size-2.5 rounded-sm bg-aurora" />Observed</li>
              <li class="flex items-center gap-1.5"><span class="size-2.5 rounded-sm border border-aurora/70 bg-[repeating-linear-gradient(135deg,rgb(109_255_184/0.5)_0_2px,transparent_2px_4px)]" />Forecast</li>
              <li class="flex items-center gap-1.5"><span class="size-2.5 rounded-sm bg-ember" />Storm (Kp ≥ 5)</li>
            </ul>
          </div>
          <div ref="box" class="relative">
            <svg v-if="bars.length" :viewBox="`0 0 ${width} ${H}`" :width="width" :height="H" class="block max-w-full" role="img" :aria-label="`Kp index for the past two days and the next three. Now ${kpNow ? fmtDec(kpNow.kp, 1) : 'unknown'}, forecast peak ${kpPeak ? fmtDec(kpPeak.kp, 1) : 'unknown'}.`">
              <defs>
                <pattern id="kp-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="4" height="4" fill="rgb(109 255 184 / 0.12)" />
                  <line x1="0" y1="0" x2="0" y2="4" stroke="rgb(109 255 184 / 0.7)" stroke-width="1.5" />
                </pattern>
                <pattern id="kp-hatch-storm" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="4" height="4" fill="rgb(255 138 92 / 0.15)" />
                  <line x1="0" y1="0" x2="0" y2="4" stroke="rgb(255 138 92 / 0.85)" stroke-width="1.5" />
                </pattern>
              </defs>
              <g font-family="var(--font-mono)" font-size="10" class="fill-faint">
                <g v-for="t in [0, 3, 6, 9]" :key="t">
                  <line :x1="M.l" :x2="width - M.r" :y1="kpY(t)" :y2="kpY(t)" class="stroke-line" />
                  <text :x="M.l - 6" :y="kpY(t)" text-anchor="end" dominant-baseline="middle">{{ t }}</text>
                </g>
              </g>
              <line :x1="M.l" :x2="width - M.r" :y1="kpY(5)" :y2="kpY(5)" class="stroke-ember/60" stroke-dasharray="4 3" />
              <text :x="width - M.r" :y="kpY(5) - 5" text-anchor="end" font-family="var(--font-mono)" font-size="10" class="label-halo fill-ember">G1 storm</text>

              <g>
                <rect
                  v-for="(b, i) in bars"
                  :key="b.time"
                  :x="b.x"
                  :y="b.y"
                  :width="b.w"
                  :height="b.h"
                  rx="2"
                  :fill="b.predicted ? (b.kp >= 5 ? 'url(#kp-hatch-storm)' : 'url(#kp-hatch)') : undefined"
                  :class="[!b.predicted && (b.kp >= 5 ? 'fill-ember' : 'fill-aurora'), hoverBar !== null && hoverBar !== i && 'opacity-50']"
                  @pointerenter="hoverBar = i"
                  @pointerleave="hoverBar = null"
                />
              </g>
              <g font-family="var(--font-mono)" font-size="10" class="fill-faint">
                <template v-for="b in bars" :key="`d${b.time}`">
                  <line v-if="b.day" :x1="b.x - 1" :x2="b.x - 1" :y1="H - M.b" :y2="H - M.b + 5" class="stroke-faint" />
                  <text v-if="b.day" :x="b.x + 2" :y="H - 8">{{ b.day }}</text>
                </template>
              </g>
              <g v-if="nowX !== null" pointer-events="none">
                <line :x1="nowX" :x2="nowX" :y1="M.t - 4" :y2="H - M.b" class="stroke-frost" stroke-dasharray="2 2" />
                <text :x="nowX + 4" :y="M.t + 4" font-family="var(--font-mono)" font-size="10" class="label-halo fill-frost">now</text>
              </g>
            </svg>
            <div v-else class="skeleton" :style="{ height: `${H}px` }" />
            <div
              v-if="hoverBar !== null && bars[hoverBar]"
              class="pointer-events-none absolute top-0 z-10 rounded-lg border border-line-strong bg-void/92 px-3 py-2 text-xs shadow-xl backdrop-blur"
              :style="bars[hoverBar]!.x > width / 2 ? { right: `${width - bars[hoverBar]!.x + 6}px` } : { left: `${bars[hoverBar]!.x + bars[hoverBar]!.w + 6}px` }"
            >
              <p class="mono text-2xs text-faint">{{ fmtDateTime(bars[hoverBar]!.time) }} · {{ bars[hoverBar]!.predicted ? 'forecast' : 'observed' }}</p>
              <p class="mt-1 text-ink">Kp {{ fmtDec(bars[hoverBar]!.kp, 2) }} · {{ kpLabel(bars[hoverBar]!.kp) }}</p>
            </div>
          </div>
        </div>

        <div v-reveal class="panel">
          <h3 class="mono mb-3 text-2xs text-faint">Chance of aurora overhead, next hour</h3>
          <ul v-if="data" class="divide-y divide-line">
            <li v-for="s in data.spots" :key="s.name" class="grid grid-cols-[minmax(0,1fr)_7rem_3rem] items-center gap-3 py-2 text-sm">
              <span class="truncate">
                {{ s.name }}
                <ClientOnly>
                  <span v-if="dark(s.lat, s.lon) !== null" class="ml-1 text-xs" :class="dark(s.lat, s.lon) ? 'text-dim' : 'text-faint'">· {{ dark(s.lat, s.lon) ? 'dark now' : 'too bright' }}</span>
                </ClientOnly>
              </span>
              <span class="h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
                <span class="block h-full rounded-full bg-aurora" :style="{ width: `${Math.min(100, s.chance * 2)}%` }" />
              </span>
              <span class="text-right tabular-nums">{{ s.chance }}%</span>
            </li>
          </ul>
          <div v-else class="skeleton h-48" />
        </div>
      </div>
    </div>
  </section>
</template>
