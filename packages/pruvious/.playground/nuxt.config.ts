const isTest = process.env.NODE_ENV === 'test' || (process.env.TEST ? process.env.TEST !== 'false' : false)

export default defineNuxtConfig({
  extends: ['..'],
  pruvious: {
    database: {
      driver: isTest
        ? 'sqlite://packages/pruvious/.playground/test/tmp/database.sqlite'
        : 'sqlite://.playground/database.sqlite',
      sync: { dropNonCollectionTables: true, dropNonFieldColumns: true },
    },
    uploads: {
      driver: isTest ? 'fs://packages/pruvious/.playground/test/tmp/.uploads' : 'fs://.playground/.uploads',
    },
    images: {
      variants: {
        mobile: { format: 'webp', width: 768 },
        desktop: { format: 'webp', width: 1920 },
        square: { format: 'webp', width: 640, height: 640, fit: 'contain' },
      },
    },
    i18n: {
      languages: [
        { code: 'en', name: 'English' },
        { code: 'de', name: 'Deutsch' },
        { code: 'de-AT', name: 'Österreichisches Deutsch' },
        { code: 'bs', name: 'Bosanski' },
      ],
    },
    dir: {
      icons: ['icons', { dir: 'brand-icons' }],
    },
    debug: {
      logs: {
        driver: isTest
          ? 'sqlite://packages/pruvious/.playground/test/tmp/logs.sqlite'
          : 'sqlite://.playground/logs.sqlite',
      },
    },
  },
  runtimeConfig: {
    _tsCheckPruvious: true,
  },
})
