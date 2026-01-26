import { defineNuxtModule } from 'nuxt/kit'
import { name, version } from '../../package.json'
import type { PruviousLocalPathModuleOptions } from './pruvious-local-path/types'

export default defineNuxtModule<PruviousLocalPathModuleOptions>({
  meta: {
    name,
    version,
    configKey: 'pruviousLocalPath',
    compatibility: { nuxt: '>=3.13.2' },
  },
  defaults: {
    requireAuth: true,
    requirePermissions: ['access-dashboard'],
  },
  setup: async (resolvedOptions, nuxt) => {
    nuxt.options.runtimeConfig.pruviousLocalPath = {
      requireAuth: resolvedOptions.requireAuth,
      requirePermissions: resolvedOptions.requirePermissions,
    }
  },
})
