<script setup lang="ts">
// North / South toggle. `compact` is the header version; the full one sits in the hero.
defineProps<{ compact?: boolean }>()
const model = defineModel<PoleId>({ required: true })

const options: { id: PoleId; short: string; long: string }[] = [
  { id: 'north', short: 'N', long: 'Arctic' },
  { id: 'south', short: 'S', long: 'Antarctic' },
]
</script>

<template>
  <div role="radiogroup" aria-label="Choose a pole" class="relative inline-grid grid-cols-2 rounded-full border border-line-strong bg-void/50 p-1" :class="compact ? 'text-xs' : 'text-sm'">
    <!-- sliding thumb -->
    <span
      aria-hidden="true"
      class="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-ice shadow-[0_0_24px_var(--color-ice-glow)] transition-transform duration-500 ease-expo"
      :class="model === 'south' && 'translate-x-full'"
    />
    <button
      v-for="o in options"
      :key="o.id"
      type="button"
      role="radio"
      :aria-checked="model === o.id"
      class="relative z-10 flex cursor-pointer items-center justify-center gap-1.5 rounded-full font-mono tracking-wider uppercase transition-colors duration-300"
      :class="[model === o.id ? 'text-void' : 'text-dim hover:text-ink', compact ? 'px-3 py-1' : 'px-5 py-2.5']"
      @click="model = o.id"
    >
      <span>90°{{ o.short }}</span>
      <span v-if="!compact" class="hidden opacity-70 sm:inline">· {{ o.long }}</span>
    </button>
  </div>
</template>
