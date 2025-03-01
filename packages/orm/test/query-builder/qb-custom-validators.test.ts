import { expect, test } from 'vitest'
import {
  Collection,
  Database,
  Field,
  emailValidator,
  numberFieldModel,
  textFieldModel,
  timestampValidator,
  uploadPathValidator,
  urlValidator,
} from '../../src'
import { initAllDrivers, qbe, qbo } from '../utils'

test('email validator', async () => {
  for (const { driver, PGPool, close } of await initAllDrivers('qb_email_validator')) {
    const db = new Database({
      driver,
      PGPool,
      collections: {
        Foo: new Collection({
          fields: {
            bar: new Field({
              model: textFieldModel(),
              options: { trim: false },
              validators: [emailValidator()],
            }),
          },
        }),
      },
    })
    const qb = db.queryBuilder()
    await db.connect()

    expect(
      await qb
        .insertInto('Foo')
        .values([{ bar: 'foo@bar.baz' }])
        .run(),
    ).toEqual(qbo(1))
    expect(await qb.update('Foo').set({ bar: ' foo@bar.baz' }).run()).toEqual(qbe({ bar: 'Invalid email address' }))
    expect(await qb.update('Foo').set({ bar: 'foo' }).run()).toEqual(qbe({ bar: 'Invalid email address' }))
    expect(await qb.update('Foo').set({ bar: 'foo@bar' }).run()).toEqual(qbo(1))
    expect(await qb.update('Foo').set({ bar: 'bar.baz' }).run()).toEqual(qbe({ bar: 'Invalid email address' }))

    await db.close()
    await close?.()
  }
})

test('timestamp validator', async () => {
  for (const { driver, PGPool, close } of await initAllDrivers('qb_timestamp_validator')) {
    const db = new Database({
      driver,
      PGPool,
      collections: {
        Foo: new Collection({
          fields: {
            bar: new Field({
              model: numberFieldModel(),
              options: { decimalPlaces: 1 },
              validators: [timestampValidator()],
            }),
          },
        }),
      },
    })
    const qb = db.queryBuilder()
    await db.connect()

    expect(
      await qb
        .insertInto('Foo')
        .values([{ bar: -8640000000000000 }])
        .run(),
    ).toEqual(qbo(1))
    expect(await qb.update('Foo').set({ bar: 8640000000000000 }).run()).toEqual(qbo(1))
    expect(await qb.update('Foo').set({ bar: 8640000000000001 }).run()).toEqual(qbe({ bar: 'Invalid timestamp' }))
    expect(await qb.update('Foo').set({ bar: -8640000000000001 }).run()).toEqual(qbe({ bar: 'Invalid timestamp' }))
    expect(await qb.update('Foo').set({ bar: 0.1 }).run()).toEqual(qbe({ bar: 'Invalid timestamp' }))
    expect(
      await qb
        .insertInto('Foo')
        .values([{ bar: 0 }])
        .run(),
    ).toEqual(qbo(1))

    await db.close()
    await close?.()
  }
})

test('upload path validator', async () => {
  for (const { driver, PGPool, close } of await initAllDrivers('qb_upload_path_validator')) {
    const db = new Database({
      driver,
      PGPool,
      collections: {
        Foo: new Collection({
          fields: {
            bar: new Field({
              model: textFieldModel(),
              options: { trim: false },
              validators: [uploadPathValidator()],
            }),
          },
        }),
      },
    })
    const qb = db.queryBuilder()
    await db.connect()

    expect(
      await qb
        .insertInto('Foo')
        .values([{ bar: '/image.webp' }])
        .run(),
    ).toEqual(qbo(1))
    expect(await qb.update('Foo').set({ bar: '/image' }).run()).toEqual(qbo(1))
    expect(await qb.update('Foo').set({ bar: '/my-dir/my-image.webp' }).run()).toEqual(qbo(1))
    expect(await qb.update('Foo').set({ bar: '/foo/bar/image.webp' }).run()).toEqual(qbo(1))
    expect(await qb.update('Foo').set({ bar: '/my.image.webp' }).run()).toEqual(qbo(1))
    expect(await qb.update('Foo').set({ bar: '/my.image-001.webp' }).run()).toEqual(qbo(1))
    expect(await qb.update('Foo').set({ bar: 'My-Image.webp' }).run()).toEqual(qbe({ bar: 'Invalid path' }))
    expect(await qb.update('Foo').set({ bar: 'image.webp' }).run()).toEqual(qbe({ bar: 'Invalid path' }))
    expect(await qb.update('Foo').set({ bar: '/my.dir/image.webp' }).run()).toEqual(qbe({ bar: 'Invalid path' }))
    expect(await qb.update('Foo').set({ bar: '/my_dir/image.webp' }).run()).toEqual(qbe({ bar: 'Invalid path' }))
    expect(await qb.update('Foo').set({ bar: '/my.image_001.webp' }).run()).toEqual(qbe({ bar: 'Invalid path' }))
    expect(await qb.update('Foo').set({ bar: '/my_image.webp' }).run()).toEqual(qbe({ bar: 'Invalid path' }))
    expect(await qb.update('Foo').set({ bar: '/Dir/image.webp' }).run()).toEqual(qbe({ bar: 'Invalid path' }))
    expect(await qb.update('Foo').set({ bar: '/dir/' }).run()).toEqual(qbe({ bar: 'Invalid path' }))
    expect(await qb.update('Foo').set({ bar: '/' }).run()).toEqual(qbe({ bar: 'Invalid path' }))
    expect(await qb.update('Foo').set({ bar: '//' }).run()).toEqual(qbe({ bar: 'Invalid path' }))

    await db.close()
    await close?.()
  }
})

test('url validator', async () => {
  for (const { driver, PGPool, close } of await initAllDrivers('qb_url_validator')) {
    const db = new Database({
      driver,
      PGPool,
      collections: {
        Foo: new Collection({
          fields: {
            bar: new Field({
              model: textFieldModel(),
              options: { trim: false },
              validators: [urlValidator()],
            }),
          },
        }),
      },
    })
    const qb = db.queryBuilder()
    await db.connect()

    expect(
      await qb
        .insertInto('Foo')
        .values([{ bar: 'http://foo.bar.baz' }])
        .run(),
    ).toEqual(qbo(1))
    expect(await qb.update('Foo').set({ bar: 'http://foo.bar.baz' }).run()).toEqual(qbo(1))
    expect(await qb.update('Foo').set({ bar: 'foo.bar.baz' }).run()).toEqual(qbe({ bar: 'Invalid URL' }))
    expect(await qb.update('Foo').set({ bar: 'http://foo' }).run()).toEqual(qbo(1))
    expect(await qb.update('Foo').set({ bar: 'foo' }).run()).toEqual(qbe({ bar: 'Invalid URL' }))
    expect(await qb.update('Foo').set({ bar: 'http://foo.bar.baz/' }).run()).toEqual(qbo(1))

    await db.close()
    await close?.()
  }
})
