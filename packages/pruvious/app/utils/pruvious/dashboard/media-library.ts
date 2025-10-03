import type { Collections, OrderBy } from '#pruvious/server'
import type { ExplicitWhereOrGroup, WhereField } from '@pruvious/orm'
import { isArray, isObject, isString } from '@pruvious/utils'
import { usePruviousDashboard } from '../../../../modules/pruvious/pruvious/utils.client'

export interface DashboardMediaLibraryState<
  TColumnNames extends string = Collections['Uploads']['TColumnNames'] | 'id',
> {
  /**
   * The current directory path (e.g. `/folder-1/folder-2`).
   */
  currentDirectory: string

  /**
   * The current filters applied to the media library.
   */
  where: (WhereField<TColumnNames> | ExplicitWhereOrGroup<TColumnNames>)[]

  /**
   * The current sorting state of the media library.
   */
  orderBy: OrderBy<TColumnNames>[]

  /**
   * The current page number.
   */
  page: number

  /**
   * The number of items to display per page.
   */
  perPage: number

  /**
   * The total number of pages.
   */
  lastPage: number

  /**
   * The total number of items.
   */
  total: number

  // @todo selected
}

/**
 * Composable containing the current state of the media library popup.
 */
export const usePruviousDashboardMediaLibraryPopup = () =>
  useState<DashboardMediaLibraryState>('pruvious-dashboard-media-library-popup', () =>
    getDefaultDashboardMediaLibraryState(),
  )

/**
 * Returns the default state of the media library.
 */
export function getDefaultDashboardMediaLibraryState(): DashboardMediaLibraryState {
  const dashboard = usePruviousDashboard()
  const defaultOrderBy = dashboard.value?.collections.Uploads?.ui.indexPage.table.orderBy
  const orderBy: DashboardMediaLibraryState['orderBy'] = []

  if (isString(defaultOrderBy)) {
    orderBy.push({ field: defaultOrderBy as any })
  } else if (isArray(defaultOrderBy)) {
    for (const item of defaultOrderBy) {
      if (isString(item)) {
        orderBy.push({ field: item as any })
      } else orderBy.push(item as any)
    }
  } else if (isObject(defaultOrderBy)) {
    orderBy.push(defaultOrderBy as any)
  }

  return {
    currentDirectory: '/',
    where: [],
    orderBy,
    page: 1,
    perPage: 50,
    lastPage: 1,
    total: 0,
    // @todo selected
  }
}
