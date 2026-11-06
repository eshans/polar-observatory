<script setup lang="ts">
// A pole-centred map (azimuthal equidistant) drawn on canvas: ocean, land, graticule, an optional
// day/night shadow and an optional heat layer of 1°×1° cells. Markers sit in an SVG on top.
// Oriented to match the satellite view: Greenland at the bottom in the north, 0° at the top in the south.
import { geoAzimuthalEquidistant, geoCircle, geoGraticule10, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import type { FeatureCollection } from 'geojson'

const props = withDefaults(
  defineProps<{
    pole: PoleId
    /** how far from the pole to show, in degrees of latitude */
    maxColat?: number
    night?: Date | null
    cells?: [number, number, number][] | null
    /** value at which a cell is drawn fully opaque */
    cellMax?: number
    markers?: MapMarker[]
    label: string
  }>(),
  { maxColat: 40, night: null, cells: null, cellMax: 40, markers: () => [] },
)

const V = 1000
const canvas = ref<HTMLCanvasElement>()
const land = shallowRef<FeatureCollection | null>(null)

// world-atlas is ~0.5 MB, so it loads only once a map is on screen
let landPromise: Promise<FeatureCollection> | null = null
onMounted(async () => {
  landPromise ??= import('world-atlas/land-50m.json').then((m) => {
    const topo = (m.default ?? m) as any
    return feature(topo, topo.objects.land) as unknown as FeatureCollection
  })
  land.value = await landPromise
})

const projection = computed(() =>
  geoAzimuthalEquidistant()
    .rotate(props.pole === 'north' ? [45, -90] : [0, 90])
    .scale((V / 2 - 6) / ((props.maxColat * Math.PI) / 180))
    .translate([V / 2, V / 2])
    .clipAngle(props.maxColat)
    .precision(0.3),
)

const toXY = (lat: number, lon: number) => projection.value([lon, lat]) ?? [-999, -999]

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

function draw() {
  const el = canvas.value
  if (!el) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const px = Math.round(el.clientWidth * dpr) || V
  if (el.width !== px) ((el.width = px), (el.height = px))
  const ctx = el.getContext('2d')!
  ctx.setTransform(px / V, 0, 0, px / V, 0, 0)
  ctx.clearRect(0, 0, V, V)
  const path = geoPath(projection.value, ctx)

  // ocean disc
  ctx.beginPath()
  path({ type: 'Sphere' })
  ctx.fillStyle = '#06182a'
  ctx.fill()

  ctx.beginPath()
  path(geoGraticule10())
  ctx.strokeStyle = 'rgb(170 220 255 / 0.08)'
  ctx.lineWidth = 1
  ctx.stroke()

  if (land.value) {
    ctx.beginPath()
    path(land.value)
    ctx.fillStyle = '#1b3550'
    ctx.fill()
    ctx.strokeStyle = 'rgb(200 235 255 / 0.35)'
    ctx.lineWidth = 0.8
    ctx.stroke()
  }

  // night side, deepening through civil, nautical and astronomical twilight
  if (props.night) {
    const [lon, lat] = subsolarPoint(props.night)
    const anti: [number, number] = [lon + 180, -lat]
    for (const radius of [90, 84, 78, 72]) {
      ctx.beginPath()
      path(geoCircle().center(anti).radius(radius)())
      ctx.fillStyle = 'rgb(2 6 14 / 0.22)'
      ctx.fill()
    }
  }

  // heat cells (aurora probability), blended additively so the oval glows
  if (props.cells?.length) {
    const aurora = css('--color-aurora') || '#6dffb8'
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = aurora
    for (const [lon, lat, v] of props.cells) {
      const a = toXY(lat - 0.5, lon - 0.5)
      const b = toXY(lat - 0.5, lon + 0.5)
      const c = toXY(lat + 0.5, lon + 0.5)
      const d = toXY(lat + 0.5, lon - 0.5)
      if (a[0] < -500) continue
      ctx.globalAlpha = Math.min(1, v / props.cellMax) * 0.85
      ctx.beginPath()
      ctx.moveTo(a[0], a[1])
      ctx.lineTo(b[0], b[1])
      ctx.lineTo(c[0], c[1])
      ctx.lineTo(d[0], d[1])
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
  }

  // rim
  ctx.beginPath()
  path({ type: 'Sphere' })
  ctx.strokeStyle = 'rgb(170 220 255 / 0.3)'
  ctx.lineWidth = 1.5
  ctx.stroke()
}

onMounted(() => {
  draw()
  if (!canvas.value) return
  const ro = new ResizeObserver(() => draw())
  ro.observe(canvas.value)
  onBeforeUnmount(() => ro.disconnect())
})
watch(() => [props.pole, props.maxColat, props.night, props.cells, land.value], draw)

const rings = computed(() => {
  const out: { lat: number; r: number }[] = []
  for (let lat = 80; lat > 90 - props.maxColat; lat -= 10) out.push({ lat, r: ((90 - lat) / props.maxColat) * (V / 2 - 6) })
  return out
})

// markers in order; a label is dropped if it would overlap one already placed (earlier markers win)
const placed = computed(() => {
  const boxes: [number, number, number, number][] = []
  return props.markers
    .map((m) => {
      const [x, y] = toXY(m.lat, m.lon)
      return { ...m, x, y }
    })
    .filter((m) => m.x > -500)
    .map((m) => {
      if (!m.label) return m
      const x0 = m.x + (m.r ?? 5) + 4
      const box: [number, number, number, number] = [x0, m.y - 12, x0 + m.label.length * 9 + 6, m.y + 10]
      const hit = boxes.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])
      if (hit) return { ...m, label: undefined }
      boxes.push(box)
      return m
    })
})

const toneClass: Record<NonNullable<MapMarker['tone']>, string> = {
  aurora: 'fill-aurora',
  ice: 'fill-ice',
  frost: 'fill-frost',
  ember: 'fill-ember',
}
</script>

<template>
  <div class="relative aspect-square w-full">
    <canvas ref="canvas" class="absolute inset-0 size-full" />
    <svg :viewBox="`0 0 ${V} ${V}`" class="absolute inset-0 size-full" role="img" :aria-label="label">
      <g font-family="var(--font-mono)" font-size="14" class="fill-faint">
        <text v-for="ring in rings" :key="ring.lat" :x="V / 2 + 4" :y="V / 2 - ring.r + 16">{{ ring.lat }}°{{ pole === 'north' ? 'N' : 'S' }}</text>
      </g>
      <g :transform="`translate(${V / 2} ${V / 2})`" class="text-frost" aria-hidden="true">
        <path d="M-14 0h28M0-14v28" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" />
      </g>
      <component
        :is="m.href ? 'a' : 'g'"
        v-for="m in placed"
        :key="m.id"
        :href="m.href"
        class="group"
      >
        <title>{{ m.title ?? m.label }}</title>
        <circle :cx="m.x" :cy="m.y" :r="Math.max(12, (m.r ?? 5) + 6)" fill="transparent" />
        <circle :cx="m.x" :cy="m.y" :r="m.r ?? 5" :class="toneClass[m.tone ?? 'frost']" class="stroke-void" stroke-width="2" fill-opacity="0.9" />
        <text v-if="m.label" :x="m.x + (m.r ?? 5) + 6" :y="m.y + 5" font-size="16" class="label-halo fill-ink">{{ m.label }}</text>
      </component>
    </svg>
  </div>
</template>
