// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  vite: { plugins: [tailwindcss()] },

  // On Cloudflare, cached API routes that opt in with `base: 'kv'` persist in Workers KV, so the cache is
  // shared across instances and survives upstream outages. Elsewhere that mount falls back to memory.
  nitro: process.env.NITRO_PRESET?.startsWith('cloudflare')
    ? { storage: { kv: { driver: 'cloudflare-kv-binding', binding: 'CACHE' } } }
    : {},

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Polar Observatory',
      meta: [
        { name: 'description', content: 'An observation deck for the ends of the Earth: live satellite views, sea ice and weather at the Arctic and Antarctic.' },
        { name: 'theme-color', content: '#040b14' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'preconnect', href: 'https://gibs.earthdata.nasa.gov' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,600&family=Hanken+Grotesk:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap',
        },
      ],
    },
  },
})
