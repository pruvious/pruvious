import type { NitroConfig } from 'nitropack/types'
import { createResolver, useNuxt } from 'nuxt/kit'

/**
 * Prevents server-side rendering (SSR) for dashboard pages.
 */
export function disableDashboardSSR(nitroConfig: NitroConfig) {
  const nuxt = useNuxt()

  nitroConfig.routeRules ??= {}
  nitroConfig.routeRules[nuxt.options.runtimeConfig.pruvious.dashboard.basePath + '**'] = { ssr: false }
  nitroConfig.routeRules['_pruviousPreview'] = { ssr: false }
}

/**
 * Aliases native Node addons (`sharp`, `better-sqlite3`) to a no-op stub on Cloudflare presets, where they cannot be
 * bundled and are never executed.
 */
export function stubNativeModulesOnCloudflare(nitroConfig: NitroConfig) {
  const nuxt = useNuxt()
  const preset = String(
    nitroConfig.preset || process.env.NITRO_PRESET || process.env.SERVER_PRESET || nuxt.options.nitro.preset || '',
  ).toLowerCase()

  if (!preset.includes('cloudflare')) {
    return
  }

  const { resolve } = createResolver(import.meta.url)
  const stub = resolve('./native-stub.mjs')

  nitroConfig.alias ??= {}
  nitroConfig.alias['sharp'] ??= stub
  nitroConfig.alias['better-sqlite3'] ??= stub
}
