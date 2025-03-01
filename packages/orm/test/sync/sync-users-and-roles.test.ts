import { expect, test } from 'vitest'
import { Collection, Database, Field, textFieldModel } from '../../src'
import { createMiniflare, pgConnection, sqliteConnectionString } from '../utils'

test('sync users and roles', async () => {
  const collections = {
    Users: new Collection({
      fields: {
        email: new Field({ model: textFieldModel(), options: {} }),
        role: new Field({ model: textFieldModel(), options: {} }),
      },
      indexes: [{ fields: ['email'], unique: true }],
      foreignKeys: [
        {
          field: 'role',
          referencedCollection: 'Roles',
          referencedField: 'name',
          action: ['ON UPDATE RESTRICT', 'ON DELETE SET NULL'],
        },
      ],
    }),
    Roles: new Collection({
      fields: { name: new Field({ model: textFieldModel(), options: {} }) },
      indexes: [{ fields: ['name'], unique: true }],
    }),
  }

  // SQLite
  const sqlite = new Database({ driver: sqliteConnectionString('sync_users_and_roles'), collections })
  await sqlite.connect()
  expect(await sqlite.listTables()).toEqual(['Options', 'Roles', 'Users'])
  expect(await sqlite.listColumns('Users')).toEqual(['id', 'email', 'role'])
  expect(await sqlite.listColumns('Roles')).toEqual(['id', 'name'])
  expect(await sqlite.listIndexes('Users')).toEqual(['UX_Users__email'])
  expect(await sqlite.listIndexes('Roles')).toEqual(['UX_Roles__name'])
  expect(await sqlite.listForeignKeys('Users')).toEqual(['FK_Users__role'])
  expect(await sqlite.listForeignKeys('Roles')).toEqual([])
  await sqlite.close()

  // PostgreSQL
  const { pgConnectionString, PGPool, drop } = await pgConnection('sync_users_and_roles')
  const pg = new Database({ driver: pgConnectionString, PGPool, collections })
  await pg.connect()
  expect(await pg.listTables()).toEqual(['Options', 'Roles', 'Users'])
  expect(await pg.listColumns('Users')).toEqual(['id', 'email', 'role'])
  expect(await pg.listColumns('Roles')).toEqual(['id', 'name'])
  expect(await pg.listIndexes('Users')).toEqual(['UX_Users__email'])
  expect(await pg.listIndexes('Roles')).toEqual(['UX_Roles__name'])
  expect(await pg.listForeignKeys('Users')).toEqual(['FK_Users__role'])
  expect(await pg.listForeignKeys('Roles')).toEqual([])
  await pg.close()
  await drop()

  // D1
  const { mf, db } = await createMiniflare()
  const d1 = new Database({ driver: db, collections })
  await d1.connect()
  expect(await d1.listTables()).toEqual(['Options', 'Roles', 'Users'])
  expect(await d1.listColumns('Users')).toEqual(['id', 'email', 'role'])
  expect(await d1.listColumns('Roles')).toEqual(['id', 'name'])
  expect(await d1.listIndexes('Users')).toEqual(['UX_Users__email'])
  expect(await d1.listIndexes('Roles')).toEqual(['UX_Roles__name'])
  expect(await d1.listForeignKeys('Users')).toEqual(['FK_Users__role'])
  expect(await d1.listForeignKeys('Roles')).toEqual([])
  await d1.close()
  await mf.dispose()
})
