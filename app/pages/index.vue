<script setup lang="ts">
const { info } = usePole()
useHead({ title: () => `${info.value.name} · Polar Observatory` })
</script>

<template>
  <div>
    <PoleHero />
    <SeaIcePulse />
    <AuroraOval />
    <LightCalendar />
    <StationWeather />
    <IcebergWatch />
    <DeepTime />
  </div>
</template>
