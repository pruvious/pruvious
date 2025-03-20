export default defineNuxtConfig({
  compatibilityDate: '2025-03-20',
  extends: ['@pruvious/ui'],
  future: { compatibilityVersion: 4 },
  nitro: {
    experimental: { asyncContext: true },
    unenv: { external: ['node:async_hooks'] },
  },
})
