import type { RouterConfig } from '@nuxt/schema'

// Switching poles only changes ?pole=, so keep the scroll position instead of jumping to the top.
export default <RouterConfig>{
  scrollBehavior(to, from, saved) {
    if (saved) return saved
    if (to.path === from.path) return false
    if (to.hash) return { el: to.hash, top: 90, behavior: 'smooth' }
    return { top: 0 }
  },
}
