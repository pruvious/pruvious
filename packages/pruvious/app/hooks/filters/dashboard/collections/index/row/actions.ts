import { defineFilter } from '#pruvious/app'
import type { Collections, SerializableCollection } from '#pruvious/server'

export interface DashboardCollectionRowAction {
  /**
   * Stable identifier used as the `v-for` key. Must be unique across all actions
   * contributed to the same collection.
   */
  key: string

  /**
   * Tabler icon name (e.g. `tabler:cloud-upload`).
   */
  icon: string

  /**
   * Visible label. A function receives the row data and returns the label text - useful
   * when the label depends on a row field.
   */
  label: string | ((row: Record<string, any>) => string)

  /**
   * Optional visibility predicate. Returning `false` hides the item for that row.
   * Omitted means always visible.
   */
  visible?: (row: Record<string, any>) => boolean

  /**
   * Styles the item with the destructive accent (red text) - use for actions that
   * delete or replace data.
   */
  destructive?: boolean

  /**
   * Renders the item as a link with the given URL. Mutually exclusive with `onClick` -
   * if both are provided, the link wins and `onClick` is ignored.
   */
  to?: (row: Record<string, any>) => string

  /**
   * Click handler invoked when the user activates the item. Receives the row data and a
   * `refresh()` helper that reloads the data table.
   */
  onClick?: (row: Record<string, any>, ctx: { refresh: () => Promise<void> }) => void | Promise<void>
}

export default defineFilter<
  DashboardCollectionRowAction[],
  {
    /**
     * The name and definition of the current collection.
     */
    collection: { name: keyof Collections; definition: SerializableCollection }
  }
>()
