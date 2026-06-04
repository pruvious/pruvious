import { defineFilter } from '#pruvious/app'
import type { Collections, SerializableCollection } from '#pruvious/server'
import type { Paginated } from '@pruvious/orm'

export default defineFilter<
  Component[],
  {
    /**
     * The name and definition of the current collection.
     */
    collection: { name: keyof Collections; definition: SerializableCollection }

    /**
     * The current query-string params backing the data table (page, perPage, where, orderBy, columns).
     */
    params: Ref<Record<string, any>>

    /**
     * Pagination snapshot of the currently displayed page.
     */
    paginated: Ref<Omit<Paginated<any>, 'records'>>

    /**
     * Reloads the data table. Pass `true` to bypass any debouncing.
     */
    refresh: (immediate?: boolean) => Promise<void>
  }
>()
