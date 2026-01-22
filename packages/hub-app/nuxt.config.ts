export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  extends: ['pruvious'],
  pruvious: {
    dashboard: {
      basePath: '/',
    },
  },
})
