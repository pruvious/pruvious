import { resolve } from 'path'

export default defineNuxtConfig({
  alias: { pruvious: resolve(process.cwd(), 'src/module') },
  devtools: {
    enabled: true,
    timeline: { enabled: true },
  },
  modules: ['pruvious'],
  pruvious: {
    database: 'sqlite:./dev.db',
    jwt: {
      secretKey: 'xxx',
    },
    language: {
      supported: [
        { name: 'English', code: 'en' },
        { name: 'Deutsch', code: 'de' },
      ],
    },
  },
})
