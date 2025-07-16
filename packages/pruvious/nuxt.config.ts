export default defineNuxtConfig({
  compatibilityDate: '2025-07-16',
  extends: ['@pruvious/ui'],
  nitro: {
    experimental: { asyncContext: true },
    unenv: { external: ['node:async_hooks'] },
  },
})
