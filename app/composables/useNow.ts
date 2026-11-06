/** The current time, set only in the browser (null during SSR) and refreshed every `everyMs`. */
export function useNow(everyMs = 60_000) {
  const now = ref<Date | null>(null)
  onMounted(() => {
    now.value = new Date()
    const id = setInterval(() => (now.value = new Date()), everyMs)
    onBeforeUnmount(() => clearInterval(id))
  })
  return now
}
