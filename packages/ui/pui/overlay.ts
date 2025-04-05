/**
 * Composable that stores the number of active overlays.
 */
export const usePUIOverlayCounter = () => useState<number>('pruvious-ui-overlay-counter', () => 0)
