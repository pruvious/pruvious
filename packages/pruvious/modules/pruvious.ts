import type { LanguageCode } from '#pruvious/server'
import {
  generateSecureRandomString,
  isString,
  omit,
  pascalCase,
  remap,
  withLeadingSlash,
  withoutTrailingSlash,
  withTrailingSlash,
} from '@pruvious/utils'
import { colorize } from 'consola/utils'
import fs from 'node:fs'
import { addServerHandler, createResolver, defineNuxtModule } from 'nuxt/kit'
import { join } from 'pathe'
import { resetServerHandlersResolver, resolveServerHandlers } from './pruvious/api/resolver'
import { resolveAuthTokenResolutionConfig, resolveAuthTokenStorageConfig } from './pruvious/auth/utils.server'
import { resetBlocksResolver } from './pruvious/blocks/resolver'
import { generateAppFiles } from './pruvious/build/app'
import { autoloadBuildFiles } from './pruvious/build/autoload'
import { generateDashboardFiles } from './pruvious/build/dashboard'
import { doBuildActions } from './pruvious/build/kit'
import { generateServerFiles } from './pruvious/build/server'
import { resetCollectionsResolver } from './pruvious/collections/resolver'
import { resolveCustomComponents } from './pruvious/components/resolver'
import { getCleanupDashboardStylesheetsScript } from './pruvious/dashboard/stylesheets'
import { debug, getErrorCount, info, resetErrorCount, setVerbose, success } from './pruvious/debug/console'
import { resolveDebugLogsConfig } from './pruvious/debug/logs'
import { resetFieldsResolver } from './pruvious/fields/resolver'
import { resetHooksResolver } from './pruvious/hooks/resolver'
import { pruviousWatchHandler, watchPruviousServerFiles } from './pruvious/nuxt-hooks/builder-watch'
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
import { normalizeImageTransformOptions } from './pruvious/uploads/images'

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
      maxFileSize: 128 * 1024 * 1024,
    },
    images: {
      variants: {
        thumbnail: { format: 'webp', width: 320, height: 320, fit: 'contain' },
      },
    },
    cache: {
      driver: 'mainDatabase',
      prefix: 'pruvious',
      page: {
        enabled: true,
        default: 'cache',
        defaultTTL: 300,
        defaultDebounce: 250,
        defaultTimeout: 1000,
        defaultQueryString: 'separate',
        headers: true,
      },
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
      sitemap: { perPage: 5000 },
      robots: true,
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
      warnings: 'all',
    },
    dir: {
      actions: { client: 'actions', server: 'actions' },
      api: 'pruvious-api',
      blocks: 'blocks',
      buildAutoload: 'build',
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
    blocksPrefix: '',
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
        maxFileSize: resolvedOptions.uploads.maxFileSize ?? 128 * 1024 * 1024,
      },
      images: {
        variants: {
          thumbnail: omit(
            normalizeImageTransformOptions({
              format: 'webp',
              originalExtension: '',
              width: 320,
              height: 320,
              fit: 'contain',
            }),
            ['originalExtension'],
          ),
          ...remap(resolvedOptions.images.variants!, (key, options) => [
            key,
            omit(normalizeImageTransformOptions({ ...options, originalExtension: '' }), ['originalExtension']),
          ]),
        },
      },
      cache: {
        driver: resolvedOptions.cache.driver!,
        prefix: resolvedOptions.cache.prefix!.replace(/:$/, ''),
        page: {
          enabled: resolvedOptions.cache.page!.enabled!,
          default: resolvedOptions.cache.page!.default!,
          defaultTTL: resolvedOptions.cache.page!.defaultTTL ?? null,
          defaultDebounce: resolvedOptions.cache.page!.defaultDebounce!,
          defaultTimeout: resolvedOptions.cache.page!.defaultTimeout!,
          defaultQueryString: resolvedOptions.cache.page!.defaultQueryString!,
          headers: resolvedOptions.cache.page!.headers!,
        },
      },
      queue: {
        driver: resolvedOptions.queue.driver!,
        mode: resolvedOptions.queue.mode!,
        secret:
          resolvedOptions.queue.secret ??
          (process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'development'
            ? 'dev'
            : generateSecureRandomString()),
      },
      auth: {
        jwt: {
          secret:
            resolvedOptions.auth.jwt!.secret ??
            (process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'development'
              ? 'dev'
              : generateSecureRandomString()),
          expiration: resolvedOptions.auth.jwt!.expiration as any,
          claims: resolvedOptions.auth.jwt!.claims!,
        },
        tokenResolution: resolveAuthTokenResolutionConfig(resolvedOptions.auth.tokenResolution),
        tokenStorage: resolveAuthTokenStorageConfig(resolvedOptions.auth.tokenStorage),
        hash: resolvedOptions.auth.hash as any,
      },
      i18n: resolveTranslationsConfig(resolvedOptions.i18n),
      routing: {
        followRedirects: resolvedOptions.routing.followRedirects!,
        trailingSlash: resolvedOptions.routing.trailingSlash!,
        seo: resolvedOptions.routing.seo!,
        sitemap:
          resolvedOptions.routing.sitemap === false
            ? false
            : {
                perPage: Math.max(
                  1,
                  (resolvedOptions.routing.sitemap === true ? undefined : resolvedOptions.routing.sitemap?.perPage) ??
                    5000,
                ),
              },
        robots: resolvedOptions.routing.robots !== false,
      },
      dashboard: {
        basePath: withLeadingSlash(withTrailingSlash(resolvedOptions.dashboard.basePath!)),
        filterStylesheets: resolvedOptions.dashboard.filterStylesheets!,
      },
      debug: {
        verbose,
        warnings: resolvedOptions.debug.warnings!,
        logs: resolveDebugLogsConfig(resolvedOptions.debug.logs),
      },
      dir: {
        actions: {
          client: withoutTrailingSlash(join(nuxt.options.serverDir, resolvedOptions.dir.actions!.client!)),
          server: withoutTrailingSlash(join(nuxt.options.serverDir, resolvedOptions.dir.actions!.server!)),
        },
        api: withoutTrailingSlash(join(nuxt.options.serverDir, resolvedOptions.dir.api!)),
        blocks: withoutTrailingSlash(join(nuxt.options.srcDir, resolvedOptions.dir.blocks!)),
        build: withoutTrailingSlash(buildDir),
        buildAutoload: withoutTrailingSlash(join(nuxt.options.serverDir, resolvedOptions.dir.buildAutoload!)),
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
      blocksPrefix: pascalCase(resolvedOptions.blocksPrefix!),
    }

    nuxt.options.runtimeConfig.public.pruvious = {
      apiBasePath: nuxt.options.runtimeConfig.pruvious.api.basePath,
      dashboardBasePath: nuxt.options.runtimeConfig.pruvious.dashboard.basePath,
      languages: nuxt.options.runtimeConfig.pruvious.i18n.languages.map(({ code }) => code) as LanguageCode[],
      primaryLanguage: nuxt.options.runtimeConfig.pruvious.i18n.primaryLanguage as LanguageCode,
      prefixPrimaryLanguage: nuxt.options.runtimeConfig.pruvious.i18n.prefixPrimaryLanguage,
      routing: {
        followRedirects: nuxt.options.runtimeConfig.pruvious.routing.followRedirects,
        trailingSlash: nuxt.options.runtimeConfig.pruvious.routing.trailingSlash,
        seo: nuxt.options.runtimeConfig.pruvious.routing.seo,
      },
      tokenStorage: nuxt.options.runtimeConfig.pruvious.auth.tokenStorage,
      translatableStringsPreloadRules: nuxt.options.runtimeConfig.pruvious.i18n.preloadTranslatableStrings,
      uploadsBasePath: nuxt.options.runtimeConfig.pruvious.uploads.basePath,
    }

    // Autoload build files
    await autoloadBuildFiles()

    // Set `#pruvious/*` aliases
    nuxt.options.alias['#pruvious/app'] = `${buildDir}/app`
    nuxt.options.alias['#pruvious/dashboard'] = `${buildDir}/dashboard`
    nuxt.options.alias['#pruvious/server'] = `${buildDir}/server`

    // Clean up `#pruvious` build directory
    fs.rmSync(buildDir, { force: true, recursive: true })
    fs.mkdirSync(buildDir)
    fs.mkdirSync(`${buildDir}/app`)
    fs.mkdirSync(`${buildDir}/dashboard`)
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
    generateAppFiles()
    generateDashboardFiles()
    await generateServerFiles()

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
    if (nuxt.options.runtimeConfig.pruvious.routing.sitemap !== false) {
      const sitemapHandler = resolve('./pruvious/routes/sitemap.handler.ts')
      addServerHandler({ route: '/sitemap.xml', handler: sitemapHandler, method: 'get' })
      addServerHandler({ route: '/sitemap-:page.xml', handler: sitemapHandler, method: 'get' })
    }
    if (nuxt.options.runtimeConfig.pruvious.routing.robots) {
      addServerHandler({
        route: '/robots.txt',
        handler: resolve('./pruvious/routes/robots.handler.ts'),
        method: 'get',
      })
    }
    if (nuxt.options.runtimeConfig.pruvious.cache.page.enabled) {
      addServerHandler({
        middleware: true,
        handler: resolve('./pruvious/cache/page.handler.ts'),
      })
    }

    // Register block component directories
    nuxt.hook('components:dirs', (dirs) => {
      for (const [i, layer] of [...nuxt.options._layers].reverse().entries()) {
        const path = withoutTrailingSlash(
          join(layer.config.srcDir, (layer.config.pruvious || undefined)?.dir?.blocks ?? 'blocks'),
        )
        if (fs.existsSync(path) && !dirs.some((dir) => (isString(dir) ? dir === path : dir.path === path))) {
          dirs.push({ path, prefix: (layer.config.pruvious || undefined)?.blocksPrefix, priority: 100 + i })
        }
      }
    })

    // Store Vite servers
    clearClientViteServers()
    nuxt.hook('vite:serverCreated', onViteServerCreated)

    // Watch Pruvious files
    await watchPruviousServerFiles()
    nuxt.hook('builder:watch', pruviousWatchHandler)

    // Exclude dashboard routes from SSR
    nuxt.hook('nitro:config', disableDashboardSSR)

    // Enable async context
    nuxt.options.experimental.asyncContext = true

    // Disable unwanted stylesheets
    if (process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'development') {
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

    await doBuildActions('module:ready', {})
  },
})
