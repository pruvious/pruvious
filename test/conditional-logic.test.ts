import { describe, expect, it } from 'vitest'
import type { ConditionalLogic, ConditionalRule } from '../src/runtime/fields/field.definition'
import { matchesConditionalLogic } from '../src/runtime/utils/conditional-logic'

describe('conditional-logic', () => {
  it('matches { bar: true }', async () => {
    const cl: ConditionalLogic | Record<string, ConditionalRule | boolean | number | string> = { bar: true }

    expect(matchesConditionalLogic({ bar: true }, 'foo', cl)).toBe(true)
    expect(matchesConditionalLogic({ bar: false }, 'foo', cl)).toBe(false)
    expect(matchesConditionalLogic({ bar: 1 }, 'foo', cl)).toBe(false)
    expect(matchesConditionalLogic({ bar: 'true' }, 'foo', cl)).toBe(false)
    expect(() => matchesConditionalLogic({}, 'foo', cl)).toThrow("The field 'bar' is required in the input")
  })

  it('matches { bar: { eq: true } }', async () => {
    const cl: ConditionalLogic | Record<string, ConditionalRule | boolean | number | string> = { bar: { eq: true } }

    expect(matchesConditionalLogic({ bar: true }, 'foo', cl)).toBe(true)
    expect(matchesConditionalLogic({ bar: false }, 'foo', cl)).toBe(false)
  })

  it('matches { bar: { ne: true } }', async () => {
    const cl: ConditionalLogic | Record<string, ConditionalRule | boolean | number | string> = { bar: { ne: true } }

    expect(matchesConditionalLogic({ bar: false }, 'foo', cl)).toBe(true)
    expect(matchesConditionalLogic({ bar: 1 }, 'foo', cl)).toBe(true)
    expect(matchesConditionalLogic({ bar: true }, 'foo', cl)).toBe(false)
  })

  it('matches { bar: { gt: 1 } }', async () => {
    const cl: ConditionalLogic | Record<string, ConditionalRule | boolean | number | string> = { bar: { gt: 1 } }

    expect(matchesConditionalLogic({ bar: 2 }, 'foo', cl)).toBe(true)
    expect(matchesConditionalLogic({ bar: 1 }, 'foo', cl)).toBe(false)
    expect(matchesConditionalLogic({ bar: '2' }, 'foo', cl)).toBe(false)
  })

  it("matches { bar: { gt: 'b' } }", async () => {
    const cl: ConditionalLogic | Record<string, ConditionalRule | boolean | number | string> = { bar: { gt: 'b' } }

    expect(matchesConditionalLogic({ bar: 'c' }, 'foo', cl)).toBe(true)
    expect(matchesConditionalLogic({ bar: 'b' }, 'foo', cl)).toBe(false)
    expect(matchesConditionalLogic({ bar: 0 }, 'foo', cl)).toBe(false)
  })

  it('matches { bar: { gte: 1 } }', async () => {
    const cl: ConditionalLogic | Record<string, ConditionalRule | boolean | number | string> = { bar: { gte: 1 } }

    expect(matchesConditionalLogic({ bar: 2 }, 'foo', cl)).toBe(true)
    expect(matchesConditionalLogic({ bar: 1 }, 'foo', cl)).toBe(true)
    expect(matchesConditionalLogic({ bar: 0 }, 'foo', cl)).toBe(false)
  })

  it('matches { bar: { lt: 1 } }', async () => {
    const cl: ConditionalLogic | Record<string, ConditionalRule | boolean | number | string> = { bar: { lt: 1 } }

    expect(matchesConditionalLogic({ bar: 0 }, 'foo', cl)).toBe(true)
    expect(matchesConditionalLogic({ bar: 1 }, 'foo', cl)).toBe(false)
  })

  it('matches { bar: { lte: 1 } }', async () => {
    const cl: ConditionalLogic | Record<string, ConditionalRule | boolean | number | string> = { bar: { lte: 1 } }

    expect(matchesConditionalLogic({ bar: 0 }, 'foo', cl)).toBe(true)
    expect(matchesConditionalLogic({ bar: 1 }, 'foo', cl)).toBe(true)
    expect(matchesConditionalLogic({ bar: 2 }, 'foo', cl)).toBe(false)
  })

  it("matches { bar: { regexp: '^foo' } }", async () => {
    const cl: ConditionalLogic | Record<string, ConditionalRule | boolean | number | string> = {
      bar: { regexp: '^foo' },
    }

    expect(matchesConditionalLogic({ bar: 'foo' }, 'foo', cl)).toBe(true)
    expect(matchesConditionalLogic({ bar: 'foo bar' }, 'foo', cl)).toBe(true)
    expect(matchesConditionalLogic({ bar: 'bar' }, 'foo', cl)).toBe(false)
    expect(matchesConditionalLogic({ bar: 'Foo' }, 'foo', cl)).toBe(false)
  })

  it('matches { bar: true, baz: true }', async () => {
    const cl: ConditionalLogic | Record<string, ConditionalRule | boolean | number | string> = { bar: true, baz: true }

    expect(matchesConditionalLogic({ bar: true, baz: true }, 'foo', cl)).toBe(true)
    expect(matchesConditionalLogic({ bar: true, baz: false }, 'foo', cl)).toBe(false)
    expect(matchesConditionalLogic({ bar: false, baz: true }, 'foo', cl)).toBe(false)
    expect(() => matchesConditionalLogic({ bar: true }, 'foo', cl)).toThrow("The field 'baz' is required in the input")
  })

  it('matches { $every: [{ bar: true }, { baz: true }] }', async () => {
    const cl: ConditionalLogic | Record<string, ConditionalRule | boolean | number | string> = {
      $every: [{ bar: true }, { baz: true }],
    }

    expect(matchesConditionalLogic({ bar: true, baz: true }, 'foo', cl)).toBe(true)
    expect(matchesConditionalLogic({ bar: true, baz: false }, 'foo', cl)).toBe(false)
    expect(matchesConditionalLogic({ bar: false, baz: true }, 'foo', cl)).toBe(false)
    expect(() => matchesConditionalLogic({ bar: true }, 'foo', cl)).toThrow("The field 'baz' is required in the input")
  })

  it('matches { $some: [{ bar: true }, { baz: true }] }', async () => {
    const cl: ConditionalLogic | Record<string, ConditionalRule | boolean | number | string> = {
      $some: [{ bar: true }, { baz: true }],
    }

    expect(matchesConditionalLogic({ bar: true, baz: true }, 'foo', cl)).toBe(true)
    expect(matchesConditionalLogic({ bar: true, baz: false }, 'foo', cl)).toBe(true)
    expect(matchesConditionalLogic({ bar: false, baz: true }, 'foo', cl)).toBe(true)
    expect(matchesConditionalLogic({ bar: false, baz: false }, 'foo', cl)).toBe(false)
    expect(() => matchesConditionalLogic({ bar: false }, 'foo', cl)).toThrow("The field 'baz' is required in the input")
  })

  it("matches { './bar': true }", async () => {
    const cl: ConditionalLogic | Record<string, ConditionalRule | boolean | number | string> = { './bar': true }

    expect(matchesConditionalLogic({ bar: true }, 'foo', cl)).toBe(true)
    expect(matchesConditionalLogic({ bar: false }, 'foo', cl)).toBe(false)
  })

  it("matches { 'bar.baz': true }", async () => {
    const cl: ConditionalLogic | Record<string, ConditionalRule | boolean | number | string> = { 'bar.baz': true }

    expect(matchesConditionalLogic({ bar: { baz: true } }, 'foo', cl)).toBe(true)
    expect(matchesConditionalLogic({ bar: { baz: false } }, 'foo', cl)).toBe(false)
    expect(() => matchesConditionalLogic({ bar: false }, 'foo', cl)).toThrow(
      "The field 'bar.baz' is required in the input",
    )
  })

  it("matches { '../bar': true }", async () => {
    const cl: ConditionalLogic | Record<string, ConditionalRule | boolean | number | string> = { '../bar': true }

    expect(matchesConditionalLogic({ bar: true }, 'foo.baz', cl)).toBe(true)
    expect(matchesConditionalLogic({ bar: false }, 'foo.baz', cl)).toBe(false)
    expect(() => matchesConditionalLogic({}, 'foo.baz', cl)).toThrow("The field 'bar' is required in the input")
  })

  it("matches { '..': { gt: 1 } }", async () => {
    const cl: ConditionalLogic | Record<string, ConditionalRule | boolean | number | string> = { '..': { gt: 1 } }

    expect(matchesConditionalLogic({ foo: [{ bar: true }, { bar: true }] }, 'foo.0.bar', cl)).toBe(true)
    expect(matchesConditionalLogic({ foo: [{ bar: true }] }, 'foo.0.bar', cl)).toBe(false)
  })

  it("matches { '../1.bar': true }", async () => {
    const cl: ConditionalLogic | Record<string, ConditionalRule | boolean | number | string> = { '../1.bar': true }

    expect(matchesConditionalLogic({ foo: [{ bar: true }, { bar: true }] }, 'foo.0.bar', cl)).toBe(true)
    expect(matchesConditionalLogic({ foo: [{ bar: false }, { bar: true }] }, 'foo.0.bar', cl)).toBe(true)
    expect(matchesConditionalLogic({ foo: [{ bar: true }, { bar: false }] }, 'foo.0.bar', cl)).toBe(false)
    expect(() => matchesConditionalLogic({ foo: [{ bar: true }] }, 'foo.0.bar', cl)).toThrow(
      "The field 'foo.1.bar' is required in the input",
    )
  })

  it("matches { '/bar': true }", async () => {
    const cl: ConditionalLogic | Record<string, ConditionalRule | boolean | number | string> = { '/bar': true }

    expect(matchesConditionalLogic({ bar: true }, 'foo.bar.baz', cl)).toBe(true)
    expect(matchesConditionalLogic({ bar: false }, 'foo.bar.baz', cl)).toBe(false)
  })
})
