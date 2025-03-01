import type { NitroConfig } from 'nitropack/types'
import { useNuxt } from 'nuxt/kit'

/**
 * Prevents server-side rendering (SSR) for dashboard pages.
 */
export function disableDashboardSSR(nitroConfig: NitroConfig) {
  const nuxt = useNuxt()

  nitroConfig.routeRules ??= {}
  nitroConfig.routeRules[nuxt.options.runtimeConfig.pruvious.dashboard.basePath + '**'] = { ssr: false }
}
