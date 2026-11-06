<script setup lang="ts">
defineProps<{ eyebrow: string; title: string; id: string; tone?: 'ice' | 'aurora' | 'ember' }>()
</script>

<template>
  <header v-reveal class="mb-8 max-w-2xl">
    <span class="eyebrow" :class="{ 'text-aurora': tone === 'aurora', 'text-ember': tone === 'ember' }">{{ eyebrow }}</span>
    <h2 :id="id" class="mt-3 font-display text-[clamp(2rem,4.4vw,3.1rem)] leading-tight font-light tracking-tight">
      {{ title }}
    </h2>
    <p v-if="$slots.default" class="mt-3 text-dim"><slot /></p>
  </header>
</template>
