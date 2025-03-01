import { describe, expect, test } from 'vitest'
import { ConditionalLogicResolver } from '../src'

describe('conditional logic resolver', () => {
  test('basic', () => {
    const resolver = new ConditionalLogicResolver()

    resolver.setInput({
      type: 'text',
      text: 'blue',
      variant: 'light',
    })

    expect(resolver.match('text', { type: { '=': 'text' } })).toEqual(true)
    expect(resolver.match('text', { type: { '=': 'image' } })).toEqual(false)
    expect(resolver.match('variant', { type: { '=': 'text' }, text: { '!=': null } })).toEqual(true)
    expect(resolver.match('variant', { type: { '=': 'text' }, text: { '=': null } })).toEqual(false)
  })

  test('mutations', () => {
    const input: Record<string, any> = { type: 'text', text: 'blue', variant: 'light' }

    const resolver = new ConditionalLogicResolver().setInput(input).setConditionalLogic({
      type: [],
      text: { type: { '=': 'text' } },
      variant: { type: { '=': 'text' }, text: { '!=': null } },
    })

    expect(resolver.resolve()).toEqual({ type: true, text: true, variant: true })
    expect(resolver.results).toEqual({ type: true, text: true, variant: true })

    input.text = null
    expect(resolver.resolve()).toEqual({ type: true, text: true, variant: false })
    expect(resolver.results).toEqual({ type: true, text: true, variant: false })

    input.type = 'image'
    input.text = 'blue'
    expect(resolver.resolve()).toEqual({ type: true, text: false, variant: false })
    expect(resolver.results).toEqual({ type: true, text: false, variant: false })
  })

  test('operators', () => {
    const resolver = new ConditionalLogicResolver()

    resolver.setInput({
      string: 'foo',
      number: 1337,
      boolean: true,
      array: [1, 2, 3],
      null: null,
    })

    expect(resolver.match('foo', { string: { '=': 'foo' } })).toEqual(true)
    expect(resolver.match('foo', { string: { '=': 'FOO' } })).toEqual(false)
    expect(resolver.match('foo', { string: { '!=': 'foo' } })).toEqual(false)
    expect(resolver.match('foo', { string: { '!=': 'FOO' } })).toEqual(true)
    expect(resolver.match('foo', { string: { '>': 'foo' as any } })).toEqual(false)
    expect(resolver.match('foo', { string: { '>=': 'foo' as any } })).toEqual(false)
    expect(resolver.match('foo', { string: { '<': 'foo' as any } })).toEqual(false)
    expect(resolver.match('foo', { string: { '<=': 'foo' as any } })).toEqual(false)
    expect(resolver.match('foo', { string: { regexp: 'foo' } })).toEqual(true)
    expect(resolver.match('foo', { string: { regexp: 'FOO' } })).toEqual(false)
    expect(resolver.match('foo', { string: { regexp: { pattern: 'FOO', flags: 'i' } } })).toEqual(true)

    expect(resolver.match('number', { number: { '=': 1337 } })).toEqual(true)
    expect(resolver.match('number', { number: { '=': 1338 } })).toEqual(false)
    expect(resolver.match('number', { number: { '!=': 1337 } })).toEqual(false)
    expect(resolver.match('number', { number: { '!=': 1338 } })).toEqual(true)
    expect(resolver.match('number', { number: { '>': 1336 } })).toEqual(true)
    expect(resolver.match('number', { number: { '>': 1337 } })).toEqual(false)
    expect(resolver.match('number', { number: { '>=': 1337 } })).toEqual(true)
    expect(resolver.match('number', { number: { '<': 1338 } })).toEqual(true)
    expect(resolver.match('number', { number: { '<': 1337 } })).toEqual(false)
    expect(resolver.match('number', { number: { '<=': 1337 } })).toEqual(true)
    expect(resolver.match('number', { number: { regexp: 1337 as any } })).toEqual(false)

    expect(resolver.match('boolean', { boolean: { '=': true } })).toEqual(true)
    expect(resolver.match('boolean', { boolean: { '=': false } })).toEqual(false)
    expect(resolver.match('boolean', { boolean: { '!=': true } })).toEqual(false)
    expect(resolver.match('boolean', { boolean: { '!=': false } })).toEqual(true)
    expect(resolver.match('boolean', { boolean: { '>': true as any } })).toEqual(false)
    expect(resolver.match('boolean', { boolean: { '>=': true as any } })).toEqual(false)
    expect(resolver.match('boolean', { boolean: { '<': true as any } })).toEqual(false)
    expect(resolver.match('boolean', { boolean: { '<=': true as any } })).toEqual(false)
    expect(resolver.match('boolean', { boolean: { regexp: true as any } })).toEqual(false)

    expect(resolver.match('array', { array: { '=': 3 } })).toEqual(true)
    expect(resolver.match('array', { array: { '=': 2 } })).toEqual(false)
    expect(resolver.match('array', { array: { '!=': 3 } })).toEqual(false)
    expect(resolver.match('array', { array: { '!=': 2 } })).toEqual(true)
    expect(resolver.match('array', { array: { '>': 2 } })).toEqual(true)
    expect(resolver.match('array', { array: { '>': 3 } })).toEqual(false)
    expect(resolver.match('array', { array: { '>=': 3 } })).toEqual(true)
    expect(resolver.match('array', { array: { '<': 4 } })).toEqual(true)
    expect(resolver.match('array', { array: { '<': 3 } })).toEqual(false)
    expect(resolver.match('array', { array: { '<=': 3 } })).toEqual(true)
    expect(resolver.match('array', { array: { regexp: 3 as any } })).toEqual(false)

    expect(resolver.match('null', { null: { '=': null } })).toEqual(true)
    expect(resolver.match('null', { null: {} })).toEqual(true)
    expect(resolver.match('null', { null: { '!=': null } })).toEqual(false)
    expect(resolver.match('null', { null: { '>': null as any } })).toEqual(false)
    expect(resolver.match('null', { null: { '>=': null as any } })).toEqual(false)
    expect(resolver.match('null', { null: { '<': null as any } })).toEqual(false)
    expect(resolver.match('null', { null: { '<=': null as any } })).toEqual(false)
    expect(resolver.match('null', { null: { regexp: null as any } })).toEqual(false)

    expect(resolver.match('bar', { bar: { '=': undefined } })).toEqual(true)
    expect(resolver.match('bar', { bar: { '=': 'foo' } })).toEqual(false)
    expect(resolver.match('bar', { bar: { '!=': 'foo' } })).toEqual(true)
    expect(resolver.match('bar', { bar: { '>': 'foo' as any } })).toEqual(false)
    expect(resolver.match('bar', { bar: { '>=': 'foo' as any } })).toEqual(false)
    expect(resolver.match('bar', { bar: { '<': 'foo' as any } })).toEqual(false)
    expect(resolver.match('bar', { bar: { '<=': 'foo' as any } })).toEqual(false)
    expect(resolver.match('bar', { bar: { regexp: 'foo' as any } })).toEqual(false)
  })

  test('current path', () => {
    const resolver = new ConditionalLogicResolver().setInput({ foo: 'FOO', bar: 'BAR' })

    expect(resolver.match('bar', { foo: { '=': 'FOO' } })).toEqual(true)
    expect(resolver.match('bar', { './foo': { '=': 'FOO' } })).toEqual(true)
  })

  test('relative path', () => {
    const resolver = new ConditionalLogicResolver().setInput({ foo: 'FOO', bar: { baz: 'BAZ' } })

    expect(resolver.match('bar.baz', { '../foo': { '=': 'FOO' } })).toEqual(true)
    expect(resolver.match('bar.baz', { './../foo': { '=': 'FOO' } })).toEqual(true)

    expect(resolver.match('foo', { 'bar.baz': { '=': 'BAZ' } })).toEqual(true)
    expect(resolver.match('foo', { './bar.baz': { '=': 'BAZ' } })).toEqual(true)
  })

  test('absolute path', () => {
    const resolver = new ConditionalLogicResolver().setInput({ foo: 'FOO', bar: { baz: 'BAZ' } })

    expect(resolver.match('bar.baz', { '/foo': { '=': 'FOO' } })).toEqual(true)
  })

  test('and group', () => {
    const resolver = new ConditionalLogicResolver().setInput({ foo: 'FOO', bar: { baz: 'BAZ' } })

    expect(
      resolver.match('bar.baz', [
        { '../foo': { '=': 'FOO' }, '/foo': { regexp: { pattern: 'foo', flags: 'i' } } },
        { '/foo': { '=': 'FOO' } },
        { '/foo': { '!=': 'foo' } },
      ]),
    ).toEqual(true)
  })

  test('or group', () => {
    const resolver = new ConditionalLogicResolver().setInput({ foo: 'FOO', bar: { baz: 'BAZ' } })

    expect(resolver.match('bar.baz', { orGroup: [{ '/foo': { '=': 'foo' } }, { '/foo': { '=': 'FOO' } }] })).toEqual(
      true,
    )

    expect(
      resolver.match('bar.baz', [
        { '../foo': { '=': 'FOO' }, '/foo': { regexp: { pattern: 'foo', flags: 'i' } } },
        { '/foo': { '=': 'FOO' } },
        { '/foo': { '!=': 'foo' } },
        { orGroup: [{ '/foo': { '=': 'foo' } }, { '/foo': { '=': 'FOO' } }] },
      ]),
    ).toEqual(true)

    expect(
      resolver.match('bar.baz', [
        { orGroup: [[{ '/foo': { '=': 'foo' } }, { '/foo': { '=': 'FOO' } }], [{ '/foo': { '=': 'FOO' } }]] },
      ]),
    ).toEqual(true)

    expect(
      resolver.match('bar.baz', [{ orGroup: [[{ '/foo': { '=': 'foo' } }, { '/foo': { '=': 'FOO' } }]] }]),
    ).toEqual(false)
  })

  test('extracting referenced fields', () => {
    const r = new ConditionalLogicResolver()

    expect(r.getReferencedFieldPaths('foo', { bar: { '=': 1 } })).toEqual(['bar'])
    expect(r.getReferencedFieldPaths('foo', { bar: { '=': 1 }, baz: { '=': 1 } })).toEqual(['bar', 'baz'])
    expect(r.getReferencedFieldPaths('foo', { '/bar': { '=': 1 } })).toEqual(['bar'])
    expect(r.getReferencedFieldPaths('foo', { '../bar': { '=': 1 } })).toEqual(['bar'])
    expect(r.getReferencedFieldPaths('foo.bar', { './bar': { '=': 1 } })).toEqual(['foo.bar'])
    expect(r.getReferencedFieldPaths('foo.bar', { '../bar': { '=': 1 } })).toEqual(['bar'])
    expect(r.getReferencedFieldPaths('foo.bar', { '../../bar': { '=': 1 } })).toEqual(['bar'])
    expect(r.getReferencedFieldPaths('foo', [{ bar: { '=': 1 } }, { bar: { '=': 1 } }])).toEqual(['bar'])
    expect(
      r.getReferencedFieldPaths('foo', { orGroup: [{ '/bar': { '=': 'foo' } }, { 'baz.0.qux': { '=': 'FOO' } }] }),
    ).toEqual(['bar', 'baz.0.qux'])
    expect(
      r.getReferencedFieldPaths('foo', [
        { size: { '=': 'sm' } },
        {
          orGroup: [
            [{ '../color': { regexp: '^(?:[a-z]+-)?blue$' } }, { '../color': { '!=': 'light-blue' } }],
            [{ '../color': { regexp: '^(?:[a-z]+-)?red$' } }],
          ],
        },
      ]),
    ).toEqual(['size', 'color'])
  })
})
