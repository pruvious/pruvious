const isTest = process.env.NODE_ENV === 'test' || (process.env.TEST ? process.env.TEST !== 'false' : false)

export default defineNuxtConfig({
  extends: ['..'],
  pruvious: {
    dashboard: {
      basePath: '/',
    },
    database: {
      driver: isTest
        ? 'sqlite://packages/local-path/src/.playground/test/tmp/database.sqlite'
        : 'sqlite://src/.playground/database.sqlite',
    },
    uploads: {
      driver: isTest ? 'fs://packages/local-path/src/.playground/test/tmp/.uploads' : 'fs://src/.playground/.uploads',
    },
    debug: {
      logs: {
        driver: isTest
          ? 'sqlite://packages/local-path/src/.playground/test/tmp/logs.sqlite'
          : 'sqlite://src/.playground/logs.sqlite',
      },
    },
  },
})
