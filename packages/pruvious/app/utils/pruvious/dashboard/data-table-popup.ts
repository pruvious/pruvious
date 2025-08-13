/**
 * Composable that manages query strings for data tables in popups.
 * Stores query strings for each collection to maintain filter state when reopening data table popups.
 */
export const usePruviousDataTablePopupQueryString = () =>
  useState<Record<string, { query: Record<string, string | null | undefined> }>>(
    'pruvious-data-table-popup-query-string',
    () => ({}),
  )
