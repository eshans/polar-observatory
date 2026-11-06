<script setup lang="ts">
// Slow, sparse snowfall drawn on a fixed canvas behind the page. Skipped entirely for reduced motion.
const canvas = ref<HTMLCanvasElement>()

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const el = canvas.value
  if (!el) return
  const ctx = el.getContext('2d')!
  let w = 0
  let h = 0
  let raf = 0
  const dpr = Math.min(window.devicePixelRatio || 1, 2)

  type Flake = { x: number; y: number; r: number; vy: number; drift: number; phase: number; a: number }
  let flakes: Flake[] = []
  const make = (y?: number): Flake => {
    const depth = Math.random() // 0 far … 1 near
    return {
      x: Math.random() * w,
      y: y ?? Math.random() * h,
      r: 0.4 + depth * 1.6,
      vy: 0.12 + depth * 0.45,
      drift: 0.2 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      a: 0.15 + depth * 0.45,
    }
  }

  const resize = () => {
    w = window.innerWidth
    h = window.innerHeight
    el.width = w * dpr
    el.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const count = Math.round(Math.min(140, (w * h) / 14_000))
    flakes = Array.from({ length: count }, () => make())
  }

  let t = 0
  const frame = () => {
    t += 0.01
    ctx.clearRect(0, 0, w, h)
    for (const f of flakes) {
      f.y += f.vy
      f.x += Math.sin(t + f.phase) * f.drift * 0.3
      if (f.y > h + 4) Object.assign(f, make(-4))
      ctx.globalAlpha = f.a
      ctx.beginPath()
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2)
      ctx.fillStyle = '#eaf6ff'
      ctx.fill()
    }
    raf = requestAnimationFrame(frame)
  }

  const onVisibility = () => {
    cancelAnimationFrame(raf)
    if (!document.hidden) raf = requestAnimationFrame(frame)
  }

  resize()
  frame()
  window.addEventListener('resize', resize)
  document.addEventListener('visibilitychange', onVisibility)
  onBeforeUnmount(() => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', resize)
    document.removeEventListener('visibilitychange', onVisibility)
  })
})
</script>

<template>
  <div aria-hidden="true" class="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
    <!-- aurora veil -->
    <div class="absolute -top-40 left-[-10%] h-[60vh] w-[120%] animate-aurora blur-3xl"
      style="background: radial-gradient(40% 50% at 30% 60%, rgb(109 255 184 / 0.10), transparent 70%), radial-gradient(35% 45% at 65% 50%, rgb(90 200 255 / 0.10), transparent 70%), radial-gradient(25% 40% at 85% 65%, rgb(170 120 255 / 0.06), transparent 70%)" />
    <canvas ref="canvas" class="absolute inset-0 size-full" />
  </div>
</template>
