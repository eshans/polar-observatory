<script setup lang="ts">
const { pole } = usePole()

const sections = [
  { label: 'View', href: '#view' },
  { label: 'Sea Ice', href: '#sea-ice' },
  { label: 'Aurora', href: '#aurora' },
  { label: 'Light', href: '#light' },
  { label: 'Weather', href: '#stations' },
  { label: 'Icebergs', href: '#icebergs' },
  { label: 'Deep Time', href: '#deep-time' },
]

const clock = ref('--:--:--')
onMounted(() => {
  const tick = () => (clock.value = new Date().toISOString().slice(11, 19))
  tick()
  const id = setInterval(tick, 1000)
  onBeforeUnmount(() => clearInterval(id))
})
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <Snowfall />

    <header
      class="fixed top-3.5 left-1/2 z-50 flex w-[min(calc(100%-24px),1100px)] -translate-x-1/2 items-center gap-2 rounded-full border border-line bg-void/60 py-2 pr-2.5 pl-4 shadow-2xl shadow-black/40 backdrop-blur-xl backdrop-saturate-150 sm:gap-4"
    >
      <NuxtLink to="/" aria-label="Polar Observatory home" class="flex items-center gap-2.5 text-ice no-underline">
        <svg viewBox="0 0 32 32" class="size-6.5" aria-hidden="true">
          <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" stroke-width="1.4" />
          <circle cx="16" cy="16" r="6" fill="none" stroke="currentColor" stroke-opacity=".45" />
          <path d="M16 2v28M2 16h28" stroke="currentColor" stroke-opacity=".35" />
          <circle cx="16" cy="16" r="2.2" class="fill-frost" />
        </svg>
        <span class="hidden font-display text-[1.05rem] font-light tracking-wide text-ink sm:inline">Polar <i class="font-normal">Observatory</i></span>
      </NuxtLink>

      <nav class="mx-auto hidden gap-0 lg:flex" aria-label="Sections">
        <a v-for="s in sections" :key="s.href" :href="s.href" class="rounded-full px-2.5 py-1.5 text-sm font-medium whitespace-nowrap text-dim xl:px-3 no-underline transition-colors hover:text-ink">
          {{ s.label }}
        </a>
      </nav>

      <PoleSwitch v-model="pole" compact class="ml-auto lg:ml-0" />

      <div class="mono hidden items-center gap-2 rounded-full bg-aurora/6 px-3.5 py-1.5 whitespace-nowrap text-aurora tabular-nums xl:flex" aria-label="Current UTC time">
        <span class="size-1.75 animate-ping-soft rounded-full bg-aurora" />
        {{ clock }} <span class="text-faint">UTC</span>
      </div>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <footer class="wrap mt-24 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-16 pb-12 text-faint">
      <div class="font-display text-2xl font-light text-dim">Polar <i>Observatory</i></div>
      <p class="mono">
        Data:
        <a href="https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api" target="_blank" rel="noopener" class="text-dim hover:text-ice">NASA GIBS</a> ·
        <a href="https://nsidc.org/data/g02135" target="_blank" rel="noopener" class="text-dim hover:text-ice">NSIDC Sea Ice Index</a> ·
        <a href="https://open-meteo.com" target="_blank" rel="noopener" class="text-dim hover:text-ice">Open-Meteo</a> ·
        <a href="https://www.swpc.noaa.gov" target="_blank" rel="noopener" class="text-dim hover:text-ice">NOAA SWPC</a> ·
        <a href="https://usicecenter.gov" target="_blank" rel="noopener" class="text-dim hover:text-ice">U.S. National Ice Center</a> ·
        <a href="https://www.ncei.noaa.gov/products/paleoclimatology" target="_blank" rel="noopener" class="text-dim hover:text-ice">NOAA Paleoclimatology</a> ·
        <a href="https://gml.noaa.gov/ccgg/trends/" target="_blank" rel="noopener" class="text-dim hover:text-ice">NOAA GML</a>
      </p>
    </footer>
  </div>
</template>
