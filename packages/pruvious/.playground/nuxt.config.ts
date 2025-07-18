const isTest = process.env.NODE_ENV === 'test' || (process.env.TEST ? process.env.TEST !== 'false' : false)

export default defineNuxtConfig({
  extends: ['..'],
  pruvious: {
    database: {
      driver: isTest
        ? 'sqlite://packages/pruvious/.playground/test/tmp/database.sqlite'
        : 'sqlite://.playground/database.sqlite',
    },
    uploads: {
      driver: 'fs://.playground/.uploads',
    },
    auth: {
      jwt: {
        secret: 'https://pruvious.com/generate-jwt-secret',
      },
    },
    i18n: {
      languages: [
        { code: 'en', name: 'English' },
        { code: 'de', name: 'Deutsch' },
        { code: 'bs', name: 'Bosanski' },
      ],
    },
    debug: {
      logs: {
        driver: isTest
          ? 'sqlite://packages/pruvious/.playground/test/tmp/logs.sqlite'
          : 'sqlite://.playground/logs.sqlite',
      },
    },
  },
})
