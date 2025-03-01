import { expect, test } from 'vitest'
import { toForeignKey, toIndex } from '../../src'

test('generate foreign key name', () => {
  expect(toForeignKey('Baz', 'bar')).toBe('FK_Baz__bar')
  expect(toForeignKey('X', 'y'.repeat(99))).toMatch(/^FK_X__y[0-9y_]{56}$/)
})

test('generate index name', () => {
  expect(toIndex('Baz', ['foo'])).toBe('IX_Baz__foo')
  expect(toIndex('Baz', ['foo'], true)).toBe('UX_Baz__foo')
  expect(toIndex('Baz', ['foo', 'bar'])).toBe('CX_Baz__foo__bar')
  expect(toIndex('Baz', ['foo', 'bar'], true)).toBe('UC_Baz__foo__bar')

  expect(toIndex('Baz', ['x'.repeat(99)])).toMatch(/^IX_Baz__x[0-9x_]{54}$/)
  expect(toIndex('Baz', ['x'.repeat(99)], true)).toMatch(/^UX_Baz__x[0-9x_]{54}$/)
  expect(toIndex('Baz', ['x', 'y'.repeat(99)])).toMatch(/^CX_Baz__x__y[0-9y_]{51}$/)
  expect(toIndex('Baz', ['x', 'y'.repeat(99)], true)).toMatch(/^UC_Baz__x__y[0-9y_]{51}$/)
})
