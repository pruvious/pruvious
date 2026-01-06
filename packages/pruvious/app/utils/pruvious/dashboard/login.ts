/**
 * Composable that stores the visibility state of the login popup.
 */
export const useLoginPopup = () => useState<boolean>('pruvious-dashboard-login-popup', () => false)
