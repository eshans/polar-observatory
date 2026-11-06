// v-reveal: fades/slides an element in the first time it scrolls into view.
export default defineNuxtPlugin((nuxtApp) => {
  let observer: IntersectionObserver | null = null

  nuxtApp.vueApp.directive<HTMLElement, number | undefined>('reveal', {
    // the server adds the class so content starts hidden; the client adds it in mounted(), so tell Vue the
    // difference during hydration is expected
    getSSRProps: () => ({ class: 'reveal', 'data-allow-mismatch': 'class' }),
    mounted(el, binding) {
      el.classList.add('reveal')
      if (binding.value) el.style.transitionDelay = `${binding.value}ms`
      observer ??= new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible')
              observer?.unobserve(entry.target)
            }
          }
        },
        { threshold: 0.12 },
      )
      observer.observe(el)
    },
    unmounted(el) {
      observer?.unobserve(el)
    },
  })
})
