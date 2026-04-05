export default defineNuxtConfig({
  colorMode: { classSuffix: '' },
  compatibilityDate: '2025-07-15',
  modules: ['@nuxt/icon', '@nuxtjs/color-mode'],
  vite: {
    optimizeDeps: {
      include: ['@vueuse/core', '@vueuse/integrations/useFocusTrap'],
    },
  },
})
