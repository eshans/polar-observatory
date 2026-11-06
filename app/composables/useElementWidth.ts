/**
 * Width of an element, tracked with a ResizeObserver. Safe when the element sits behind a v-if:
 * it starts observing whenever the element appears and stops when it goes away.
 */
export function useElementWidth(el: Ref<HTMLElement | undefined>, initial = 900, min = 300) {
  const width = ref(initial)
  let ro: ResizeObserver | null = null
  onMounted(() => {
    ro = new ResizeObserver(([entry]) => {
      if (entry) width.value = Math.max(min, Math.round(entry.contentRect.width))
    })
    watch(
      el,
      (node, old) => {
        if (old) ro?.unobserve(old)
        if (node) ro?.observe(node)
      },
      { immediate: true, flush: 'post' },
    )
  })
  onBeforeUnmount(() => ro?.disconnect())
  return width
}
