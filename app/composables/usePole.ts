/** The pole being observed, kept in the URL (?pole=south) so a view can be shared. */
export function usePole() {
  const route = useRoute()
  const router = useRouter()
  const pole = computed<PoleId>({
    get: () => (route.query.pole === 'south' ? 'south' : 'north'),
    set: (p) => {
      router.replace({ query: { ...route.query, pole: p === 'north' ? undefined : p }, hash: route.hash })
    },
  })
  const info = computed(() => POLES[pole.value])
  return { pole, info }
}
