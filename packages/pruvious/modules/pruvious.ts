import {
  generateSecureRandomString,
  isString,
  withLeadingSlash,
  withoutTrailingSlash,
  withTrailingSlash,
} from '@pruvious/utils'
import { colorize } from 'consola/utils'
import fs from 'node:fs'
import { addServerHandler, createResolver, defineNuxtModule } from 'nuxt/kit'
import { join } from 'pathe'
import { isDevelopment } from 'std-env'
import { resetServerHandlersResolver, resolveServerHandlers } from './pruvious/api/resolver'
import { resolveAuthTokenResolutionConfig, resolveAuthTokenStorageConfig } from './pruvious/auth/utils.server'
import { resetBlocksResolver } from './pruvious/blocks/resolver'
import { generateClientFiles } from './pruvious/build/client'
import { generateServerFiles } from './pruvious/build/server'
import { resetCollectionsResolver } from './pruvious/collections/resolver'
import { resolveCustomComponents } from './pruvious/components/resolver'
import { getCleanupDashboardStylesheetsScript } from './pruvious/dashboard/stylesheets'
import { debug, getErrorCount, info, resetErrorCount, setVerbose, success } from './pruvious/debug/console'
import { resolveDebugLogsConfig } from './pruvious/debug/logs'
import { resetFieldsResolver } from './pruvious/fields/resolver'
import { resetHooksResolver } from './pruvious/hooks/resolver'
import { watchPruviousFiles } from './pruvious/nuxt-hooks/builder-watch'
import { optimizeServerTsConfig } from './pruvious/nuxt-hooks/nitro-build-before'
import { disableDashboardSSR } from './pruvious/nuxt-hooks/nitro-config'
import { optimizeTsConfig } from './pruvious/nuxt-hooks/prepare-types'
import { clearClientViteServers, onViteServerCreated } from './pruvious/nuxt-hooks/vite-server'
import type { PruviousModuleOptions } from './pruvious/PruviousModuleOptions'
import { resetJobsResolver } from './pruvious/queue/resolver'
import { resetSingletonsResolver } from './pruvious/singletons/resolver'
import { resetTemplatesResolver } from './pruvious/templates/resolver'
import { resetTranslationsResolver } from './pruvious/translations/resolver'
import { resolveTranslationsConfig } from './pruvious/translations/utils.server'

export default defineNuxtModule<PruviousModuleOptions>({
  meta: {
    name: 'pruvious',
    version: '4.0.0',
    configKey: 'pruvious',
    compatibility: { nuxt: '>=3.13.2' },
  },
  defaults: {
    database: {
      driver: 'sqlite://database.sqlite',
      sync: {
        dropNonCollectionTables: false,
        dropNonFieldColumns: false,
      },
    },
    api: {
      basePath: '/api/',
    },
    uploads: {
      driver: 'fs://.uploads',
      basePath: '/uploads/',
    },
    cache: {
      driver: 'mainDatabase',
      prefix: 'pruvious',
    },
    queue: {
      driver: 'mainDatabase',
      mode: 'auto',
    },
    auth: {
      jwt: {
        expiration: {
          default: '4h',
          extended: '7d',
        },
        claims: {},
      },
      hash: {
        algorithm: 'bcrypt',
        bcrypt: { rounds: 12 },
      },
    },
    routing: {
      followRedirects: true,
      trailingSlash: false,
      seo: true,
    },
    dashboard: {
      basePath: '/dashboard/',
      filterStylesheets: [
        '.p-',
        '.pui-',
        '--pui-',
        '[data-sonner-toaster]',
        '[data-tippy-root]',
        '.vue-inspector-',
        '.nuxt-devtools-',
      ],
    },
    debug: {
      verbose: false,
    },
    dir: {
      actions: { client: 'actions', server: 'actions' },
      api: 'pruvious-api',
      build: '.pruvious',
      collections: 'collections',
      fields: { components: 'fields', definitions: 'fields' },
      filters: { client: 'filters', server: 'filters' },
      hooks: { client: 'hooks', server: 'hooks' },
      jobs: 'jobs',
      singletons: 'singletons',
      templates: 'templates',
      translations: 'translations',
    },
  },
  setup: async (resolvedOptions, nuxt) => {
    const start = performance.now()
    const verbose =
      !!resolvedOptions.debug.verbose ||
      process.argv.includes('--pruviousVerbose') ||
      process.argv.includes('--pruvious-verbose')
    const buildDir = join(nuxt.options.rootDir, resolvedOptions.dir.build!)
    const { resolve } = createResolver(import.meta.url)

    setVerbose(verbose)
    resetErrorCount()
    debug('Setting up `pruvious` module')

    nuxt.options.runtimeConfig.pruvious = {
      database: resolvedOptions.database as any,
      api: {
        basePath: withLeadingSlash(withTrailingSlash(resolvedOptions.api.basePath!)),
        middleware: {
          include: resolvedOptions.api.middleware?.include ?? ['/api/**'],
          exclude: resolvedOptions.api.middleware?.exclude ?? [
            '/api/_*',
            '/api/_*/**',
            '/api/process-queue',
            '/api/routes/**',
          ],
        },
      },
      uploads: {
        driver: resolvedOptions.uploads.driver as any,
        basePath: withLeadingSlash(withTrailingSlash(resolvedOptions.uploads.basePath!)),
      },
      cache: {
        driver: resolvedOptions.cache.driver!,
        prefix: resolvedOptions.cache.prefix!.replace(/:$/, ''),
      },
      queue: {
        driver: resolvedOptions.queue.driver!,
        mode: resolvedOptions.queue.mode!,
        secret: resolvedOptions.queue.secret ?? generateSecureRandomString(),
      },
      auth: {
        jwt: {
          secret: resolvedOptions.auth.jwt!.secret ?? generateSecureRandomString(),
          expiration: resolvedOptions.auth.jwt!.expiration as any,
          claims: resolvedOptions.auth.jwt!.claims!,
        },
        tokenResolution: resolveAuthTokenResolutionConfig(resolvedOptions.auth.tokenResolution),
        tokenStorage: resolveAuthTokenStorageConfig(resolvedOptions.auth.tokenStorage),
        hash: resolvedOptions.auth.hash as any,
      },
      i18n: resolveTranslationsConfig(resolvedOptions.i18n),
      debug: {
        verbose,
        logs: resolveDebugLogsConfig(resolvedOptions.debug.logs),
      },
      dashboard: {
        basePath: withLeadingSlash(withTrailingSlash(resolvedOptions.dashboard.basePath!)),
        filterStylesheets: resolvedOptions.dashboard.filterStylesheets!,
      },
      dir: {
        actions: {
          client: withoutTrailingSlash(join(nuxt.options.serverDir, resolvedOptions.dir.actions!.client!)),
          server: withoutTrailingSlash(join(nuxt.options.serverDir, resolvedOptions.dir.actions!.server!)),
        },
        api: withoutTrailingSlash(join(nuxt.options.serverDir, resolvedOptions.dir.api!)),
        blocks: withoutTrailingSlash(join(nuxt.options.srcDir, resolvedOptions.dir.blocks!)),
        build: withoutTrailingSlash(buildDir),
        collections: withoutTrailingSlash(join(nuxt.options.serverDir, resolvedOptions.dir.collections!)),
        fields: {
          components: withoutTrailingSlash(join(nuxt.options.serverDir, resolvedOptions.dir.fields!.components!)),
          definitions: withoutTrailingSlash(join(nuxt.options.serverDir, resolvedOptions.dir.fields!.definitions!)),
        },
        filters: {
          client: withoutTrailingSlash(join(nuxt.options.serverDir, resolvedOptions.dir.filters!.client!)),
          server: withoutTrailingSlash(join(nuxt.options.serverDir, resolvedOptions.dir.filters!.server!)),
        },
        hooks: {
          client: withoutTrailingSlash(join(nuxt.options.serverDir, resolvedOptions.dir.hooks!.client!)),
          server: withoutTrailingSlash(join(nuxt.options.serverDir, resolvedOptions.dir.hooks!.server!)),
        },
        jobs: withoutTrailingSlash(join(nuxt.options.serverDir, resolvedOptions.dir.jobs!)),
        singletons: withoutTrailingSlash(join(nuxt.options.serverDir, resolvedOptions.dir.singletons!)),
        translations: withoutTrailingSlash(join(nuxt.options.serverDir, resolvedOptions.dir.translations!)),
        templates: withoutTrailingSlash(join(nuxt.options.serverDir, resolvedOptions.dir.templates!)),
      },
    }

    nuxt.options.runtimeConfig.public.pruvious = {
      apiBasePath: nuxt.options.runtimeConfig.pruvious.api.basePath,
      primaryLanguage: nuxt.options.runtimeConfig.pruvious.i18n.primaryLanguage,
      prefixPrimaryLanguage: nuxt.options.runtimeConfig.pruvious.i18n.prefixPrimaryLanguage,
      routing: resolvedOptions.routing as Required<PruviousModuleOptions['routing']>,
      tokenStorage: nuxt.options.runtimeConfig.pruvious.auth.tokenStorage,
      translatableStringsPreloadRules: nuxt.options.runtimeConfig.pruvious.i18n.preloadTranslatableStrings,
    }

    // Set `#pruvious/*` aliases
    nuxt.options.alias['#pruvious/client'] = `${buildDir}/client`
    nuxt.options.alias['#pruvious/server'] = `${buildDir}/server`

    // Clean up `#pruvious` build directory
    fs.rmSync(buildDir, { force: true, recursive: true })
    fs.mkdirSync(buildDir)
    fs.mkdirSync(`${buildDir}/client`)
    fs.mkdirSync(`${buildDir}/server`)

    // Reset resolvers
    resetBlocksResolver()
    resetCollectionsResolver()
    resetFieldsResolver()
    resetHooksResolver()
    resetJobsResolver()
    resetServerHandlersResolver()
    resetSingletonsResolver()
    resetTemplatesResolver()
    resetTranslationsResolver()

    // Resolve custom components
    resolveCustomComponents()

    // Generate `#pruvious/*` files
    generateClientFiles()
    generateServerFiles()

    // Optimize TypeScript configs for `#pruvious/*` imports
    nuxt.hook('prepare:types', optimizeTsConfig)
    nuxt.hook('nitro:build:before', optimizeServerTsConfig)

    // Add server handlers
    for (const { route, handler, method } of await resolveServerHandlers()) {
      addServerHandler({ route, handler, method })
    }
    addServerHandler({
      route: nuxt.options.runtimeConfig.pruvious.uploads.basePath + '**',
      handler: resolve('./pruvious/uploads/handler.ts'),
    })

    // Register block component directories
    nuxt.hook('components:dirs', (dirs) => {
      for (const [i, layer] of [...nuxt.options._layers].reverse().entries()) {
        const path = withoutTrailingSlash(join(layer.config.srcDir, layer.config.pruvious?.dir?.blocks ?? 'blocks'))
        if (fs.existsSync(path) && !dirs.some((dir) => (isString(dir) ? dir === path : dir.path === path))) {
          dirs.push({ path, priority: 100 + i })
        }
      }
    })

    // Store Vite servers
    clearClientViteServers()
    nuxt.hook('vite:serverCreated', onViteServerCreated)

    // Watch Pruvious files
    nuxt.hook('builder:watch', watchPruviousFiles)

    // Exclude dashboard routes from SSR
    nuxt.hook('nitro:config', disableDashboardSSR)

    // Enable async context
    nuxt.options.experimental.asyncContext = true

    // Remove dynamic imports from entry points
    nuxt.hook('build:manifest', (manifest) => {
      for (const item of Object.values(manifest)) {
        if (item.isEntry || item.isDynamicEntry) {
          item.dynamicImports = []
        }
      }
    })

    // Disable unwanted stylesheets
    if (isDevelopment) {
      nuxt.options.app.head.script ??= []
      nuxt.options.app.head.script.unshift({
        innerHTML: getCleanupDashboardStylesheetsScript(
          nuxt.options.runtimeConfig.pruvious.dashboard.filterStylesheets,
          nuxt.options.runtimeConfig.pruvious.dashboard.basePath,
        ),
      })
    }

    // Log build time
    if (getErrorCount() === 0) {
      success(`Pruvious built in ${Math.round(performance.now() - start)}ms`)
    } else {
      const errors = getErrorCount() === 1 ? '1 error' : `${getErrorCount()} errors`
      info(`Pruvious built in ${Math.round(performance.now() - start)}ms with ${colorize('yellow', errors)}`)
      if (!nuxt.options.dev) {
        throw new Error('Pruvious build failed. Check the logs above for more information.')
      }
    }
  },
})
