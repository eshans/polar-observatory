// Below-the-fold data loads in the browser (server: false) to keep the HTML small.
// Shared fetches: every component that calls these gets the same request and data for the current pole.
export function useSeaIce() {
  const { pole } = usePole()
  return useFetch<SeaIce>('/api/sea-ice', { query: { pole }, key: computed(() => `sea-ice-${pole.value}`) })
}

export function useStations() {
  const { pole } = usePole()
  return useFetch<Stations>('/api/stations', { query: { pole }, key: computed(() => `stations-${pole.value}`) })
}

export function useAurora() {
  const { pole } = usePole()
  return useFetch<Aurora>('/api/aurora', { query: { pole }, key: computed(() => `aurora-${pole.value}`), server: false, lazy: true })
}

export function useIcebergs() {
  return useFetch<Iceberg[]>('/api/icebergs', { key: 'icebergs', server: false, lazy: true })
}

export function useDeepTime() {
  const { pole } = usePole()
  return useFetch<DeepTime>('/api/deep-time', { query: { pole }, key: computed(() => `deep-time-${pole.value}`), server: false, lazy: true })
}
