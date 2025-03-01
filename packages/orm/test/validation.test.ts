import { expect, test } from 'vitest'
import { Collection, Database, Field, GenericField, textFieldModel, type CollectionDefinition } from '../src'

test('validate table names', () => {
  expect(() => new Database({ collections: { foo: new Collection({ key: 'foo', fields: {} }) } })).not.toThrow()
  expect(() => new Database({ collections: { $foo: new Collection({ key: 'foo', fields: {} }) } })).toThrow()
  expect(() => new Database({ collections: { '': new Collection({ key: 'foo', fields: {} }) } })).toThrow()
  expect(() => new Database({ collections: { foo_bar: new Collection({ key: 'foo', fields: {} }) } })).not.toThrow()
  expect(() => new Database({ collections: { foo__bar: new Collection({ key: 'foo', fields: {} }) } })).toThrow()
  expect(() => new Database({ collections: { Foo: new Collection({ key: 'foo', fields: {} }) } })).not.toThrow()
  expect(() => new Database({ collections: { FooBar: new Collection({ key: 'foo', fields: {} }) } })).not.toThrow()
  expect(() => new Database({ collections: { Foo_Bar: new Collection({ key: 'foo', fields: {} }) } })).not.toThrow()
})

test('validate collection ids', () => {
  expect(() => new Database({ collections: { foo: new Collection({ key: 'foo', fields: {} }) } })).not.toThrow()
  expect(() => new Database({ collections: { id: new Collection({ key: 'id', fields: {} }) } })).not.toThrow()
  expect(() => new Database({ collections: { foo: new Collection({ key: '$foo', fields: {} }) } })).toThrow()
  expect(() => new Database({ collections: { foo: new Collection({ key: '', fields: {} }) } })).toThrow()
  expect(() => new Database({ collections: { foo: new Collection({ fields: {} }) } })).not.toThrow()
  expect(() => new Database({ collections: { foo: new Collection({ key: 'foo__bar', fields: {} }) } })).not.toThrow()
})

test('check for duplicate collection identifiers', () => {
  const fooFoo = () => ({ foo: new Collection({ key: 'foo', fields: {} }) })
  const barBar = () => ({ bar: new Collection({ key: 'bar', fields: {} }) })
  const barFoo = () => ({ foo: new Collection({ key: 'bar', fields: {} }) })
  const FooBar = () => ({ BAR: new Collection({ key: 'FOO', fields: {} }) })
  const BarFoo = () => ({ FOO: new Collection({ key: 'BAR', fields: {} }) })

  expect(() => new Database({ collections: { ...fooFoo(), ...barBar() } })).not.toThrow()
  expect(() => new Database({ collections: { ...fooFoo(), ...fooFoo() } })).not.toThrow()
  expect(() => new Database({ collections: { ...fooFoo(), ...barFoo() } })).not.toThrow()
  expect(() => new Database({ collections: { ...barBar(), ...barFoo() } })).toThrow()
  expect(() => new Database({ collections: { ...fooFoo(), ...FooBar() } })).not.toThrow()
  expect(() => new Database({ collections: { ...fooFoo(), ...BarFoo() } })).not.toThrow()
})

test('validate column name', () => {
  const cm: CollectionDefinition<Record<string, GenericField>, Record<string, any>> = { key: 'foo', fields: {} }
  const C = (column?: string) => ({
    foo: new Collection({
      ...cm,
      fields: { [column!]: new Field({ key: 'foo', model: textFieldModel(), options: {} }) },
    }),
  })

  expect(() => new Database({ collections: C('foo') })).not.toThrow()
  expect(() => new Database({ collections: C('$foo') })).toThrow()
  expect(() => new Database({ collections: C('') })).toThrow()
  expect(() => new Database({ collections: C() })).not.toThrow()
  expect(() => new Database({ collections: C('foo_bar') })).not.toThrow()
  expect(() => new Database({ collections: C('foo__bar') })).toThrow()
})

test('validate field ids', () => {
  const cm: CollectionDefinition<Record<string, GenericField>, Record<string, any>> = { key: 'foo', fields: {} }
  const C = (id?: string) => ({
    foo: new Collection({ ...cm, fields: { foo: new Field({ key: id!, model: textFieldModel(), options: {} }) } }),
  })

  expect(() => new Database({ collections: C('foo') })).not.toThrow()
  expect(() => new Database({ collections: C('$foo') })).toThrow()
  expect(() => new Database({ collections: C('id') })).toThrow()
  expect(() => new Database({ collections: C('') })).toThrow()
  expect(() => new Database({ collections: C() })).not.toThrow()
  expect(() => new Database({ collections: C('foo__bar') })).not.toThrow()
})

test('check for duplicate field identifiers', () => {
  const cm: CollectionDefinition<Record<string, GenericField>, Record<string, any>> = { key: 'foo', fields: {} }
  const C = (fields?: Record<string, GenericField>) => ({ foo: new Collection({ ...cm, fields: fields! }) })
  const fooFoo = () => ({ foo: new Field({ key: 'foo', model: textFieldModel(), options: {} }) })
  const barBar = () => ({ bar: new Field({ key: 'bar', model: textFieldModel(), options: {} }) })
  const barFoo = () => ({ foo: new Field({ key: 'bar', model: textFieldModel(), options: {} }) })
  const FooBar = () => ({ BAR: new Field({ key: 'FOO', model: textFieldModel(), options: {} }) })
  const BarFoo = () => ({ FOO: new Field({ key: 'BAR', model: textFieldModel(), options: {} }) })

  expect(() => new Database({ collections: C({ ...fooFoo(), ...barBar() }) })).not.toThrow()
  expect(() => new Database({ collections: C({ ...fooFoo(), ...fooFoo() }) })).not.toThrow()
  expect(() => new Database({ collections: C({ ...fooFoo(), ...barFoo() }) })).not.toThrow()
  expect(() => new Database({ collections: C({ ...barBar(), ...barFoo() }) })).toThrow()
  expect(() => new Database({ collections: C({ ...fooFoo(), ...FooBar() }) })).not.toThrow()
  expect(() => new Database({ collections: C({ ...fooFoo(), ...BarFoo() }) })).not.toThrow()
})
