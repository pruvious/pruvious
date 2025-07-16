/**
 * Composable that stores the visibility state of the login popup.
 */
export const usePruviousLoginPopup = () => useState<boolean>('pruvious-dashboard-login-popup', () => false)
