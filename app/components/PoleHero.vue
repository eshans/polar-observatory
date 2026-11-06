<script setup lang="ts">
const { pole, info } = usePole()
const { data: ice } = useSeaIce()
const { data: stations } = useStations()
const unit = useTempUnit()
const now = useNow()

const sun = computed(() => (now.value ? poleSun(pole.value, now.value) : null))
const daysUntil = (d: Date) => Math.max(0, Math.ceil((d.getTime() - now.value!.getTime()) / 86_400_000))

const coldest = computed(() => {
  const list = stations.value?.stations
  return list?.length ? list.reduce((a, b) => (b.temp < a.temp ? b : a)) : null
})

const iceVsMedian = computed(() => {
  if (!ice.value) return null
  const med = ice.value.climatology.median[ice.value.rank.doy]!
  return ice.value.latest.extent - med
})
</script>

<template>
  <section id="view" class="wrap scroll-mt-28 pt-32 sm:pt-36" aria-labelledby="hero-title">
    <div class="grid items-start gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.15fr)] lg:gap-14">
      <div class="lg:sticky lg:top-28">
        <span class="eyebrow">Observation deck · {{ info.label }}</span>
        <Transition mode="out-in" enter-from-class="opacity-0 translate-y-3" leave-to-class="opacity-0 -translate-y-3" enter-active-class="transition duration-500 ease-expo" leave-active-class="transition duration-200">
          <div :key="pole">
            <h1 id="hero-title" class="mt-4 font-display text-[clamp(3rem,8vw,5.6rem)] leading-[0.95] font-light tracking-tight">
              {{ info.name.split(' ')[0] }} <i class="font-normal text-ice">{{ info.name.split(' ')[1] }}</i>
            </h1>
            <p class="mt-5 max-w-md text-lg text-dim">{{ info.tagline }}</p>
          </div>
        </Transition>

        <PoleSwitch v-model="pole" class="mt-8" />

        <dl class="mt-10 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3 lg:grid-cols-1">
          <div class="bg-void/80 p-4">
            <dt class="mono text-2xs text-faint">Sun at the pole</dt>
            <dd class="mt-2">
              <template v-if="sun">
                <span class="font-display text-2xl font-light tabular-nums">{{ fmtSigned(sun.altitude, 1) }}°</span>
                <span class="mt-1 block text-sm text-dim">
                  {{ sun.up ? 'Midnight sun' : lightPhase(sun.altitude) }}<template v-if="sun.next"> · {{ sun.up ? 'sets' : 'rises' }} in {{ daysUntil(sun.next) }} days</template>
                </span>
              </template>
              <span v-else class="skeleton block h-12 w-full" />
            </dd>
          </div>
          <div class="bg-void/80 p-4">
            <dt class="mono text-2xs text-faint">Sea ice today</dt>
            <dd class="mt-2">
              <template v-if="ice">
                <span class="font-display text-2xl font-light tabular-nums">{{ fmtDec(ice.latest.extent, 2) }}<span class="text-base text-dim"> M km²</span></span>
                <span class="mt-1 block text-sm text-dim">{{ ordinal(ice.rank.position) }} lowest of {{ ice.rank.of }} years<template v-if="iceVsMedian !== null"> · {{ fmtSigned(iceVsMedian) }} vs median</template></span>
              </template>
              <span v-else class="skeleton block h-12 w-full" />
            </dd>
          </div>
          <div class="bg-void/80 p-4">
            <dt class="mono text-2xs text-faint">Coldest station now</dt>
            <dd class="mt-2">
              <template v-if="coldest">
                <span class="font-display text-2xl font-light tabular-nums">{{ fmtTemp(coldest.temp, unit) }}{{ unit }}</span>
                <a :href="`#station-${coldest.id}`" class="mt-1 block text-sm text-dim no-underline hover:text-ice">{{ coldest.name }} · feels {{ fmtTemp(coldest.feelsLike, unit) }}</a>
              </template>
              <span v-else class="skeleton block h-12 w-full" />
            </dd>
          </div>
        </dl>
      </div>

      <PolarView />
    </div>
  </section>
</template>
