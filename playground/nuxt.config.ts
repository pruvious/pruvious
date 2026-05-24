import { resolve } from 'path'

export default defineNuxtConfig({
  alias: { pruvious: resolve(process.cwd(), 'src/module') },
  compatibilityDate: '2026-05-24',
  devtools: {
    enabled: true,
    timeline: { enabled: true },
  },
  modules: ['../src/module'],
  pruvious: {
    database: 'sqlite:./dev.db',
    jwt: {
      secretKey: 'xxx',
    },
  },
})
