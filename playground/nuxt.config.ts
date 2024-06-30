import { resolve } from 'path'

export default defineNuxtConfig({
  alias: { pruvious: resolve(process.cwd(), 'src/module') },
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
