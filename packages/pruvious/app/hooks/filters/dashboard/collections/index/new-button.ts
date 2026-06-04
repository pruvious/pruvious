import { defineFilter } from '#pruvious/app'
import type { Collections, SerializableCollection } from '#pruvious/server'

export interface DashboardCollectionNewButton {
  /**
   * Visible label of the "New" button.
   */
  label: string

  /**
   * Tabler icon name (e.g. `tabler:note`).
   */
  icon: string

  /**
   * Absolute path the button navigates to.
   */
  to: string
}

export default defineFilter<
  DashboardCollectionNewButton,
  {
    /**
     * The name and definition of the current collection.
     */
    collection: { name: keyof Collections; definition: SerializableCollection }
  }
>()
