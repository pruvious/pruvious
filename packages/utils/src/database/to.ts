import { uniqueTrim } from '../string/hash'

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
