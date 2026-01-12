import { camelCase } from '../string/case'
import { uniqueTrim } from '../string/hash'

/**
 * Generates an index name for a database based on the provided `table` and `columns`.
 * If the generated name exceeds 63 characters, it will be shortened while remaining unique.
 * If `unique` is `true`, the index name will start with `UX` or `UC` instead of `IX` or `CX`.
 * By default, `unique` is `false`.
 *
 * @example
 * ```ts
 * toIndex('Products', ['price']) // IX_Products__price
 * toIndex('Products', ['price'], true) // UX_Products__price
 * toIndex('Products', ['price', 'discount']) // CX_Products__price__discount
 * toIndex('Products', ['price', 'discount'], true) // UC_Products__price__discount
 * ```
 */
export function toIndex(table: string, columns: string[], unique = false) {
  const prefix = unique ? (columns.length === 1 ? 'UX' : 'UC') : columns.length === 1 ? 'IX' : 'CX'
  return uniqueTrim(`${prefix}_${table}__${columns.join('__')}`, 63)
}

/**
 * Generates a foreign key name for a database based on the provided `table` and `columns`.
 * If the generated name exceeds 63 characters, it will be shortened while remaining unique.
 *
 * @example
 * ```ts
 * toForeignKey('Products', 'price') // FK_Products__price
 * ```
 */
export function toForeignKey(table: string, column: string) {
  return uniqueTrim(`FK_${table}__${column}`, 63)
}

/**
 * Generates junction identifiers for a many-to-many relationship between two tables.
 *
 * Returns an object containing:
 *
 * - `tableName` - The junction table name.
 *   - If `fieldB` is provided, the junction `tableName` will include both fields.
 *   - If the generated name exceeds 63 characters, it will be shortened while remaining unique.
 * - `columnA` - The junction column name for `tableA`.
 * - `columnB` - The junction column name for `tableB`.
 *
 * @example
 * ```ts
 * toJunction('Products', 'categories', 'Categories')
 * // {
 * //   tableName: 'JN_Products__categories__Categories',
 * //   columnA: 'productsId',
 * //   columnB: 'categoriesId',
 * // }
 *
 * toJunction('Products', 'categories', 'Categories', 'products')
 * // {
 * //   tableName: 'JN_Categories__products__Products__categories',
 * //   columnA: 'productsId',
 * //   columnB: 'categoriesId',
 * // }
 * ```
 */
export function toJunction(tableA: string, fieldA: string, tableB: string, fieldB?: string) {
  let tableName: string

  if (fieldB) {
    const [firstTable, secondTable] = [tableA, tableB].sort()
    const [firstField, secondField] = firstTable === tableA ? [fieldA, fieldB] : [fieldB, fieldA]
    tableName = uniqueTrim(`JN_${firstTable}__${firstField}__${secondTable}__${secondField}`, 63)
  } else {
    tableName = uniqueTrim(`JN_${tableA}__${fieldA}__${tableB}`, 63)
  }

  return {
    tableName,
    columnA: `${camelCase(tableA).slice(0, 61)}Id`,
    columnB: `${camelCase(tableB).slice(0, 61)}Id`,
  }
}
