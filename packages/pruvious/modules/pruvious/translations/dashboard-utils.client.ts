import type { LanguageCode } from '#pruvious/server'

/**
 * Composable that provides access to the active language code used for collection records and singletons in the dashboard.
 * The language is manually selected by users through the dashboard interface and persisted in their `dashboard` settings.
 */
export const useDashboardContentLanguage = () =>
  useState<LanguageCode>('pruvious-dashboard-content-language', () => null as any)
