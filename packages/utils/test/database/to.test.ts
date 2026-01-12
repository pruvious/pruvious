import { expect, test } from 'vitest'
import { toForeignKey, toIndex, toJunction } from '../../src'

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

test('generate foreign key name', () => {
  expect(toForeignKey('Baz', 'bar')).toBe('FK_Baz__bar')
  expect(toForeignKey('X', 'y'.repeat(99))).toMatch(/^FK_X__y[0-9y_]{56}$/)
})

test('generate junction table name', () => {
  expect(toJunction('Products', 'categories', 'Categories')).toEqual({
    tableName: 'JN_Products__categories__Categories',
    columnA: 'productsId',
    columnB: 'categoriesId',
    columnOrderA: 'productsOrder',
    columnOrderB: 'categoriesOrder',
  })
  expect(toJunction('Products', 'categories', 'Categories', 'products')).toEqual({
    tableName: 'JN_Categories__products__Products__categories',
    columnA: 'productsId',
    columnB: 'categoriesId',
    columnOrderA: 'productsOrder',
    columnOrderB: 'categoriesOrder',
  })
  expect(toJunction('A', 'a', 'B'.repeat(50)).tableName).toMatch(/^JN_A__a__B{50}$/)
  expect(toJunction('A', 'a', 'B'.repeat(99)).tableName).toMatch(/^JN_A__a__B[0-9B_]{53}$/)
  expect(toJunction('A', 'a', 'B', 'b'.repeat(50)).tableName).toMatch(/^JN_A__a__B__b{50}$/)
  expect(toJunction('A', 'a', 'B', 'b'.repeat(99)).tableName).toMatch(/^JN_A__a__B__b[0-9b_]{50}$/)
})
