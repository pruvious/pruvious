import { resolve } from 'path'

export default defineNuxtConfig({
  alias: { pruvious: resolve(process.cwd(), 'src/module') },
  devtools: {
    enabled: true,
    timeline: { enabled: true },
  },
  modules: ['pruvious'],
  pruvious: {
    pageCache: { type: 'redis' },
    dashboard: {
      baseComponents: {
        misc: {
          Logo: './components/dashboard/misc/Logo.vue',
        },
      },
    },
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
