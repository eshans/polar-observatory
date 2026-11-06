<script setup lang="ts">
const { pole } = usePole()
const { data, error } = useIcebergs()

const biggest = computed(() => data.value?.[0]?.areaKm2 ?? 1)
const markers = computed<MapMarker[]>(() =>
  (data.value ?? []).map((b, i) => ({
    id: b.name,
    lat: b.lat,
    lon: b.lon,
    label: i < 6 ? b.name : undefined,
    title: `${b.name}: ${fmtInt(b.areaKm2)} km², ${b.lengthKm} × ${b.widthKm} km`,
    r: 3 + Math.sqrt(b.areaKm2 / biggest.value) * 16,
    tone: i < 6 ? ('ice' as const) : ('frost' as const),
  })),
)
const totalArea = computed(() => (data.value ?? []).reduce((sum, b) => sum + b.areaKm2, 0))

const QUADRANT: Record<string, string> = { A: '0–90°W', B: '90–180°W', C: '90–180°E', D: '0–90°E' }
const fmtLat = (lat: number) => `${fmtDec(Math.abs(lat), 1)}°${lat < 0 ? 'S' : 'N'}`
const fmtLon = (lon: number) => `${fmtDec(Math.abs(lon), 1)}°${lon < 0 ? 'W' : 'E'}`
</script>

<template>
  <section id="icebergs" class="wrap scroll-mt-28 pt-28" aria-labelledby="icebergs-title">
    <SectionHead id="icebergs-title" eyebrow="Iceberg watch · U.S. National Ice Center" :title="pole === 'south' ? 'The giants adrift' : 'The giants are in the south'">
      <template v-if="pole === 'south'">
        Antarctic icebergs at least 18 km (10 nautical miles) long get a name when they calve, and satellites keep tracking them as they drift and shrink.
        The letter tells you which quadrant it calved from; the number is a running count.
      </template>
      <template v-else>
        Greenland's glaciers calve tens of thousands of icebergs a year, but they are small enough that nobody names them one by one.
        The truly enormous ones break off Antarctica's floating ice shelves, and those are tracked individually.
      </template>
    </SectionHead>

    <div v-if="pole === 'north'" v-reveal class="panel flex flex-wrap items-center justify-between gap-4">
      <p class="max-w-xl text-dim">
        <template v-if="data?.length">
          Right now <span class="text-ink">{{ data.length }} named icebergs</span> are adrift in the Southern Ocean, the largest ({{ data[0]!.name }}) covering
          <span class="text-ink">{{ fmtInt(data[0]!.areaKm2) }} km²</span>, {{ bergLike(data[0]!.areaKm2) }}.
        </template>
        <template v-else>The Southern Ocean holds dozens of named icebergs at any time.</template>
      </p>
      <button type="button" class="btn" @click="pole = 'south'">See them at 90°S →</button>
    </div>

    <template v-else>
      <p v-if="error" class="error-note">{{ errorText(error) }}</p>
      <div v-else class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div v-reveal class="panel p-3 sm:p-4">
          <div v-if="!data" class="skeleton aspect-square w-full rounded-full" />
          <ClientOnly v-else>
            <PolarMap pole="south" :max-colat="37" :markers="markers" label="Positions of named Antarctic icebergs, sized by area" />
            <template #fallback><div class="skeleton aspect-square w-full rounded-full" /></template>
          </ClientOnly>
          <p v-if="data?.length" class="mono mt-3 px-2 text-2xs text-faint">
            {{ data.length }} icebergs · {{ fmtInt(totalArea) }} km² in total · positions as of {{ fmtDate(data[0]!.updated) }}
          </p>
        </div>

        <div v-reveal class="panel">
          <h3 class="mono mb-3 text-2xs text-faint">Largest ten</h3>
          <ol v-if="data" class="divide-y divide-line">
            <li v-for="(b, i) in data.slice(0, 10)" :key="b.name" class="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-baseline gap-3 py-2.5">
              <span class="mono text-2xs text-faint">{{ i + 1 }}</span>
              <div class="min-w-0">
                <p class="font-display text-lg leading-tight">
                  {{ b.name }}
                  <span class="ml-1 font-sans text-xs text-faint" :title="`Calved in the ${QUADRANT[b.name[0]!]} quadrant`">{{ QUADRANT[b.name[0]!] }}</span>
                </p>
                <p class="text-xs text-dim">{{ b.lengthKm }} × {{ b.widthKm }} km · {{ fmtLat(b.lat) }}, {{ fmtLon(b.lon) }}</p>
              </div>
              <div class="text-right">
                <p class="tabular-nums">{{ fmtInt(b.areaKm2) }} <span class="text-xs text-faint">km²</span></p>
                <p class="text-xs text-dim">{{ bergLike(b.areaKm2) }}</p>
              </div>
            </li>
          </ol>
          <div v-else class="skeleton h-96" />
        </div>
      </div>
    </template>
  </section>
</template>
