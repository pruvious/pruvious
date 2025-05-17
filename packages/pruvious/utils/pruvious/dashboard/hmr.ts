import { dashboardBasePath } from '#pruvious/client/base'
import { i18n } from '#pruvious/client/i18n'
import { clear } from '@pruvious/utils'
import { useDebounceFn } from '@vueuse/core'
import { isDevelopment } from 'std-env'
import { refreshAuthState } from '../../../modules/pruvious/auth/utils.client'
import { refreshPruviousDashboardState, refreshPruviousState } from '../../../modules/pruvious/pruvious/utils.client'

let isListening = false

/**
 * Composable that reloads Pruvious components on server file changes in development mode.
 */
export function usePruviousHMR() {
  const eventHandler = useDebounceFn(async () => {
    const route = useRoute()
    let to = route.fullPath

    try {
      const redirectURL = new URL(route.fullPath)
      redirectURL.pathname = redirectURL.pathname.replace(/\/_redirect$/, '')
      redirectURL.searchParams.delete('_redirect')
      to = redirectURL.toString()
    } catch {
      to = to.split('?')[0]!
    }

    clear((i18n() as any).definitions)
    clear((i18n() as any).cache)

    await Promise.all([refreshPruviousState(true), refreshAuthState(true), refreshPruviousDashboardState(true)])
    await navigateTo({ path: dashboardBasePath + '_redirect', query: { to } }, { replace: true })
  }, 50)

  function stop() {
    if (isListening) {
      isListening = false
      import.meta.hot?.off('pruvious:reload', eventHandler)
    }
  }

  function start() {
    if (isDevelopment && !isListening) {
      import.meta.hot?.on('pruvious:reload', eventHandler)
      isListening = true
    }
  }

  return { start, stop }
}
