import { setup } from '@nuxt/test-utils'
import { emptyDirSync, removeSync } from 'fs-extra'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import pgConnectionString from 'pg-connection-string'
import { Sequelize } from 'sequelize'
import { describe } from 'vitest'
import { walkDir } from '../src/runtime/utils/fs'
import { isString } from '../src/runtime/utils/string'

describe('server', async () => {
  if (process.env.NUXT_PRUVIOUS_DATABASE?.startsWith('postgresql:')) {
    const config = pgConnectionString.parse(process.env.NUXT_PRUVIOUS_DATABASE)

    const db = new Sequelize({
      dialect: 'postgres',
      database: config.database || '',
      host: config.host || '',
      port: config.port ? +config.port : 5432,
      username: config.user,
      password: config.password,
      ssl: isString(config.ssl) ? config.ssl === 'true' : !!config.ssl,
      dialectOptions: { ssl: config.ssl ? { require: true, rejectUnauthorized: false } : undefined },
      logging: false,
    })

    await db.authenticate()
    await db.query(
      'DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO pruvious; GRANT ALL ON SCHEMA public TO public;',
    )
  } else {
    removeSync(resolve(process.cwd(), 'test.db'))
  }

  emptyDirSync(resolve(process.cwd(), 'test/fixtures/basic/.uploads'))

  await setup({ rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url)), waitFor: 30000 })

  const suitesDir = fileURLToPath(new URL('./basic', import.meta.url))

  for (const { fullPath } of walkDir(suitesDir, { endsWith: '.test.ts' })) {
    await import(fullPath)
  }
})
