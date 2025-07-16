/**
 * Composable that stores a unique key for synchronizing the Pruvious route data between the dashboard and the preview iframe.
 */
export const usePruviousPreviewKey = () => useState<string | undefined>('pruvious-preview-key', () => undefined)
