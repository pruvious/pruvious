import { expect, test } from 'vitest'
import { bigIntFieldModel, Collection, Database, Field, textFieldModel } from '../../src'
import { createMiniflare, pgConnection, sqliteConnectionString } from '../utils'

test('cascade FK does not wipe child rows during schema sync', async () => {
  const base = {
    Grand: new Collection({ fields: {} }),
    Parents: new Collection({
      fields: { ref: new Field({ model: bigIntFieldModel(), options: {} }) },
      foreignKeys: [{ field: 'ref', referencedCollection: 'Grand' }],
    }),
    Children: new Collection({
      fields: { parent: new Field({ model: bigIntFieldModel(), options: {} }) },
      foreignKeys: [
        {
          field: 'parent',
          referencedCollection: 'Parents',
          action: ['ON UPDATE RESTRICT', 'ON DELETE CASCADE'],
        },
      ],
    }),
  }

  const seed = async (db: Database) => {
    await db.exec('insert into "Grand" default values')
    await db.exec('insert into "Parents" (ref) values (1)')
    await db.exec('insert into "Children" (parent) values (1)')
  }

  const withExtra = {
    ...base,
    Parents: new Collection({
      fields: {
        ref: new Field({ model: bigIntFieldModel(), options: {} }),
        extra: new Field({ model: textFieldModel(), options: {} }),
      },
      foreignKeys: [{ field: 'ref', referencedCollection: 'Grand' }],
    }),
  }

  // SQLite
  const sqliteCS = sqliteConnectionString('sync_cascade_fk')

  const sqlite1 = new Database({ driver: sqliteCS, collections: base })
  await sqlite1.connect()
  await seed(sqlite1)
  await sqlite1.close()

  const sqlite2 = new Database({ driver: sqliteCS, collections: withExtra })
  await sqlite2.connect()
  expect(await sqlite2.exec('select count(*) as count from "Children"')).toEqual([{ count: 1 }])
  await sqlite2.close()

  // PostgreSQL
  const pgC = await pgConnection('sync_cascade_fk')

  const pg1 = new Database({ driver: pgC.pgConnectionString, PGPool: pgC.PGPool, collections: base })
  await pg1.connect()
  await seed(pg1)
  await pg1.close()

  const pg2 = new Database({ driver: pgC.pgConnectionString, PGPool: pgC.PGPool, collections: withExtra })
  await pg2.connect()
  expect(await pg2.exec('select count(*) as count from "Children"')).toEqual([{ count: '1' }])
  await pg2.close()
  await pgC.drop()
})
