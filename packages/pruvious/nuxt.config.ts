export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  extends: ['@pruvious/ui'],
  nitro: {
    experimental: { asyncContext: true },
    unenv: { external: ['node:async_hooks'] },
  },
  vite: {
    optimizeDeps: {
      include: [
        '@floating-ui/vue',
        '@vueuse/core',
        '@vueuse/integrations/useFocusTrap',
        'dompurify',
        'dot-prop',
        'marked',
        'nanoid',
        'tippy.js',
        'vue-sonner',
      ],
    },
  },
})
