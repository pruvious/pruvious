export interface IPUITable {
  /**
   * The column definitions for this table.
   */
  columns: any

  /**
   * An array of data rows to display in the table.
   * Each row should contain a key for each column in the table.
   */
  data: any

  /**
   * Controls the sorting state of the table.
   * When `null`, no sorting is applied.
   */
  sort: any

  /**
   * Controls whether the table rows are selectable.
   */
  selectable: any

  /**
   * A key-value map of row IDs to their selection state.
   */
  selected: any

  /**
   * Represents the current selection state for all rows in the table.
   */
  selectAllState: any
}

export interface PUITable<TColumns extends PUIColumns> extends IPUITable {
  columns: TColumns
  data: Ref<PUIRow<TColumns>[]>
  sort: Ref<PUITableSort<TColumns>>
  selectable: Ref<boolean>
  selectAllState: Ref<boolean | 'indeterminate'>
}

export interface PUITableOptions<TColumns extends PUIColumns> extends Partial<IPUITable> {
  columns: TColumns
  /** @default [] */
  data?: MaybeRef<PUIRow<TColumns>[]>
  /** @default null */
  sort?: MaybeRef<PUITableSort<TColumns>>
  /** @default false */
  selectable?: MaybeRef<boolean>
  /** @default {} */
  selected?: MaybeRef<{ [id: string]: boolean }>
  /** @default false */
  selectAllState?: MaybeRef<boolean | 'indeterminate'>
}

export interface PUIColumn<T = any> {
  /**
   * The column label.
   * If not provided, the column key will be used.
   */
  label?: string

  /**
   * Controls if the column can be sorted.
   * Accepts a boolean to enable/disable sorting or a string to specify the data type for proper sort icons.
   *
   * @default false
   */
  sortable?: boolean | 'text' | 'numeric'

  /**
   * Sets the width of a table column using CSS values like `100px`, `20rem`, `50%`, `auto`, etc.
   * The specified `width` is applied to the `style` attribute of `<col>` elements within the `<colgroup>`.
   */
  width?: string

  /**
   * Sets the minimum width of a table column using CSS values like `100px`, `20rem`, etc.
   * The specified `min-width` is applied to the `style` attribute of `<col>` elements within the `<colgroup>`.
   *
   * The `minWidth` property is useful for specifying `width` in percentages while ensuring a minimum width for the column.
   */
  minWidth?: string

  /**
   * The data type for values in this column.
   *
   * Note: This is a TypeScript type assertion and does not involve any runtime logic or data.
   */
  TType: T
}

export interface PUIColumns {
  [key: string]: PUIColumn
}

type InferColumnType<T> = T extends { TType: infer U } ? U : any

export type PUIRow<T extends PUIColumns> = {
  /**
   * A unique identifier for this record.
   */
  id: number | string
} & Partial<{
  [K in keyof T]: InferColumnType<T[K]>
}>

export interface PUICell<T extends PUIColumns> {
  /**
   * The row data object containing values for each column.
   */
  row: PUIRow<T>

  /**
   * The zero-based index of the current row in the table data array.
   */
  rowIndex: number

  /**
   * The column definition object containing configuration like label, width, etc.
   */
  column: PUIColumn<InferColumnType<T>>

  /**
   * The column key/identifier for the current cell.
   */
  key: string | number

  /**
   * The zero-based index of the current column in the table.
   */
  columnIndex: number
}

export type PUITableSort<TColumns extends PUIColumns> = {
  /**
   * The key of the column to sort by.
   */
  column: keyof TColumns

  /**
   * The direction to sort the column.
   */
  direction: 'asc' | 'desc'
} | null

/**
 * Helper function for creating a column definition for use in the `PUITable` component.
 *
 * @example
 * ```ts
 * puiTable({
 *   columns: {
 *     id: puiColumn<number>({ label: 'ID', width: '4rem' }),
 *     name: puiColumn<string>({ label: 'Name', minWidth: '8rem' }),
 *     types: puiColumn<string[]>({ label: 'Types', minWidth: '14rem' }),
 *     height: puiColumn<number>({ label: 'Height', width: '8rem' }),
 *     weight: puiColumn<number>({ label: 'Weight', width: '8rem' }),
 *   },
 *   data: [],
 * })
 * ```
 */
export function puiColumn<T = any>(definition: Omit<PUIColumn<T>, 'TType'>): PUIColumn<T> {
  return definition as any
}

/**
 * Composable for generating and managing a table model for use in the `PUITable` component.
 *
 * @example
 * ```vue
 * <template>
 *   <PUITable :columns="columns" :data="data" />
 * </template>
 *
 * <script lang="ts" setup>
 * const { columns, data } = puiTable({
 *   columns: {
 *     id: puiColumn<number>({ label: 'ID', width: '4rem' }),
 *     name: puiColumn<string>({ label: 'Name', minWidth: '8rem' }),
 *     types: puiColumn<string[]>({ label: 'Types', minWidth: '14rem' }),
 *     height: puiColumn<number>({ label: 'Height', width: '8rem' }),
 *     weight: puiColumn<number>({ label: 'Weight', width: '8rem' }),
 *   },
 *   data: [
 *     { id: 1, name: 'Bulbasaur', types: ['Grass', 'Poison'], height: 0.7, weight: 6.9 },
 *     { id: 2, name: 'Ivysaur', types: ['Grass', 'Poison'], height: 1, weight: 13 },
 *     { id: 3, name: 'Venusaur', types: ['Grass', 'Poison'], height: 2, weight: 100 },
 *     { id: 4, name: 'Charmander', types: ['Fire'], height: 0.6, weight: 8.5 },
 *     { id: 5, name: 'Charmeleon', types: ['Fire'], height: 1.1, weight: 19 },
 *     { id: 6, name: 'Charizard', types: ['Fire', 'Flying'], height: 1.7, weight: 90.5 },
 *     { id: 7, name: 'Squirtle', types: ['Water'], height: 0.5, weight: 9 },
 *     { id: 8, name: 'Wartortle', types: ['Water'], height: 1, weight: 22.5 },
 *     { id: 9, name: 'Blastoise', types: ['Water'], height: 1.6, weight: 85.5 },
 *     // ...
 *   ],
 * })
 * </script>
 * ```
 */
export function puiTable<TColumns extends PUIColumns>(options: PUITableOptions<TColumns>): PUITable<TColumns> {
  return {
    columns: options.columns,
    data: toRef(options.data ?? []) as any,
    sort: toRef(options.sort ?? null) as any,
    selectable: toRef(options.selectable ?? false),
    selected: toRef(options.selected ?? {}) as any,
    selectAllState: toRef(options.selectAllState ?? false),
  }
}
