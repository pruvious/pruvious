export default defineNuxtConfig({
  compatibilityDate: '2024-11-03',
  extends: ['@pruvious/ui'],
  future: { compatibilityVersion: 4 },
  nitro: {
    experimental: { asyncContext: true },
    unenv: { external: ['node:async_hooks'] },
  },
})
