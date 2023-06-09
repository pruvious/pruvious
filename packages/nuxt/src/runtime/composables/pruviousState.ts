import { Pruvious, Ref, useState } from '#imports'

/**
 * (Re)active Pruvious state.
 */
export const usePruvious: () => Ref<{
  page: Pruvious.Page | null
  data: Record<string, Record<string, any> | null>
}> = () =>
  useState<{
    /**
     * The currently active page object fetched from the Pruvious CMS.
     */
    page: Pruvious.Page | null

    /**
     * Async data fetched on the server.
     */
    data: Record<string, Record<string, any> | null>
  }>('pruvious', () => ({
    page: null,
    data: {},
  }))
