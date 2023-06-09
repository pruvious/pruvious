import { defineNuxtConfig } from 'nuxt/config'

const pruviousConfig = process.env.PRUVIOUS_PLAYGROUND
  ? { cmsBaseUrl: 'http://127.0.0.1:2999', cmsDir: '../../tmp' }
  : { cmsBaseUrl: 'http://127.0.0.1:3333', cmsDir: '../api' }

export default defineNuxtConfig({
  pages: true,
  css: ['~/assets/css/main.css'],
  modules: [['@pruvious-test/nuxt', { ...pruviousConfig }]],
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
})
