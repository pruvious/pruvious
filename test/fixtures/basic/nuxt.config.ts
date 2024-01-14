// @ts-nocheck
import pruvious from '../../../src/module'

export default defineNuxtConfig({
  modules: [pruvious],
  pruvious: {
    customCapabilities: ['test-capability'],
    database: 'sqlite:./test.db',
    jwt: {
      secretKey: 'xxx',
    },
    language: {
      supported: [
        { name: 'English', code: 'en' },
        { name: 'Deutsch', code: 'de' },
      ],
    },
    standardCollections: {
      users: false,
    },
  },
})
