<script setup lang="ts">
const { pole, info } = usePole()
const { data, error, status } = useStations()
const unit = useTempUnit()
const now = useNow()

const coldestId = computed(() => {
  const list = data.value?.stations
  return list?.length ? list.reduce((a, b) => (b.temp < a.temp ? b : a)).id : null
})

/** 48-hour temperature sparkline as an SVG path in a 200×48 box, plus where "now" falls. */
function spark(s: StationReading) {
  const pts = s.hourly
  if (pts.length < 2) return null
  const t0 = Date.parse(pts[0]!.time)
  const t1 = Date.parse(pts[pts.length - 1]!.time)
  const temps = pts.map((p) => p.temp)
  const lo = Math.min(...temps)
  const hi = Math.max(...temps)
  const pad = Math.max(1, (hi - lo) * 0.15)
  const X = (t: number) => ((t - t0) / (t1 - t0)) * 200
  const Y = (v: number) => 44 - ((v - (lo - pad)) / (hi - lo + 2 * pad)) * 40
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(Date.parse(p.time)).toFixed(1)} ${Y(p.temp).toFixed(1)}`).join('')
  const nowX = X(Date.parse(s.time))
  return { d, nowX, nowY: Y(s.temp), lo, hi }
}

const sunAt = (s: StationReading) => (now.value ? sunAltitude(s.lat, s.lon, now.value) : null)
</script>

<template>
  <section id="stations" class="wrap scroll-mt-28 pt-28" aria-labelledby="stations-title">
    <div class="flex flex-wrap items-end justify-between gap-6">
      <SectionHead id="stations-title" eyebrow="Station weather · live" tone="aurora" :title="`Conditions across the ${info.region}`">
        Six outposts, from the pole itself to the edges of the ice. Readings are model estimates from Open-Meteo for each site, refreshed every 15 minutes.
      </SectionHead>
      <div class="mb-8 flex gap-1.5" role="group" aria-label="Temperature unit">
        <button type="button" class="btn" :aria-pressed="unit === 'C'" @click="unit = 'C'">°C</button>
        <button type="button" class="btn" :aria-pressed="unit === 'F'" @click="unit = 'F'">°F</button>
      </div>
    </div>

    <p v-if="error" class="error-note">{{ errorText(error) }}</p>

    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <template v-if="!data && status === 'pending'">
        <div v-for="n in 6" :key="n" class="skeleton h-72 rounded-panel" />
      </template>
      <article
        v-for="(s, k) in data?.stations ?? []"
        :id="`station-${s.id}`"
        :key="`${pole}-${s.id}`"
        v-reveal="k * 60"
        class="panel flex scroll-mt-28 flex-col gap-4 transition-colors target:border-aurora"
      >
        <header class="flex items-start justify-between gap-3">
          <div>
            <h3 class="font-display text-xl font-normal">{{ s.name }}</h3>
            <p class="text-sm text-dim">{{ s.place }}</p>
          </div>
          <div class="flex flex-col items-end gap-1.5 text-right">
            <span v-if="s.id === coldestId" class="mono rounded-full bg-ice/12 px-2.5 py-0.5 text-2xs text-ice">Coldest now</span>
            <span class="mono text-2xs text-faint tabular-nums">
              <ClientOnly>{{ now ? fmtLocalTime(now, s.tz) : '' }} local</ClientOnly>
            </span>
          </div>
        </header>

        <div class="flex items-end justify-between gap-3">
          <p class="font-display text-6xl leading-none font-light tracking-tight tabular-nums">
            {{ fmtTemp(s.temp, unit) }}<span class="align-top text-2xl text-dim">{{ unit }}</span>
          </p>
          <div class="text-right text-sm text-dim">
            <p>{{ weatherLabel(s.code) }}</p>
            <p>Feels <span class="text-ink">{{ fmtTemp(s.feelsLike, unit) }}</span></p>
          </div>
        </div>

        <svg v-if="spark(s)" viewBox="0 0 200 48" class="h-12 w-full overflow-visible" preserveAspectRatio="none" role="img" :aria-label="`Temperature over 48 hours, from ${fmtTemp(spark(s)!.lo, unit)} to ${fmtTemp(spark(s)!.hi, unit)}`">
          <line :x1="spark(s)!.nowX" :x2="spark(s)!.nowX" y1="0" y2="48" class="stroke-line-strong" vector-effect="non-scaling-stroke" stroke-dasharray="2 3" />
          <path :d="spark(s)!.d" fill="none" class="stroke-ice" stroke-width="1.75" vector-effect="non-scaling-stroke" stroke-linejoin="round" />
        </svg>
        <div class="mono -mt-3 flex justify-between text-2xs text-faint"><span>−24 h</span><span>now</span><span>+24 h</span></div>

        <dl class="grid grid-cols-3 gap-3 border-t border-line pt-4 text-sm">
          <div>
            <dt class="mono text-2xs text-faint">Wind <span class="normal-case">km/h</span></dt>
            <dd class="mt-1 flex items-center gap-1.5 tabular-nums">
              <svg viewBox="0 0 16 16" class="size-3.5 shrink-0 text-ice" :style="{ transform: `rotate(${s.windDir + 180}deg)` }" aria-hidden="true"><path d="M8 1l4 12-4-3-4 3z" fill="currentColor" /></svg>
              {{ Math.round(s.wind) }} <span class="text-faint">{{ compass(s.windDir) }}</span>
            </dd>
          </div>
          <div>
            <dt class="mono text-2xs text-faint">Gusts <span class="normal-case">km/h</span></dt>
            <dd class="mt-1 tabular-nums">{{ Math.round(s.gusts) }}</dd>
          </div>
          <div>
            <dt class="mono text-2xs text-faint">Sun angle</dt>
            <dd class="mt-1 tabular-nums">
              <ClientOnly>
                <template v-if="sunAt(s) !== null">{{ fmtSigned(sunAt(s)!, 0) }}°</template>
                <template #fallback>—</template>
              </ClientOnly>
            </dd>
          </div>
        </dl>

        <p class="mt-auto text-xs text-faint">{{ s.note }} · {{ fmtInt(s.elevation) }} m</p>
      </article>
    </div>
  </section>
</template>
