import {
  addRouteMiddleware,
  addServerHandler,
  addServerPlugin,
  createResolver,
  defineNuxtModule,
  extendPages,
} from '@nuxt/kit'
import { defu } from 'defu'
import fs from 'fs-extra'
import { nanoid } from 'nanoid'
import path from 'path'
import semver from 'semver'
import { isDevelopment, isTest } from 'std-env'
import { warn } from './runtime/instances/logger'
import {
  initModulePathResolver,
  initRootDir,
  resolveAppPath,
  resolveLayerPath,
  resolveModulePath,
  resolveRelativeAppPath,
  resolveRelativeModulePath,
} from './runtime/instances/path'
import { cacheLayerPaths, cacheModuleOptions, getModuleOption, getModuleOptions } from './runtime/instances/state'
import { boot, createComponentDirectories, validateLanguageOptions, watchPruviousFiles } from './runtime/main'
import type { ModuleOptions } from './runtime/module-types'
import { parse } from './runtime/utils/bytes'
import { getDatabaseInfo } from './runtime/utils/database'
import { patchModuleOptions } from './runtime/utils/module-options'
import { mergeDefaults } from './runtime/utils/object'
import { isString, joinRouteParts, pascalCase } from './runtime/utils/string'

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'pruvious',
    configKey: 'pruvious',
  },
  defaults: {
    api: {
      prefix: 'api',
      routes: {
        'clear-cache.post': 'clear-cache',
        'collections': 'collections',
        'dashboard.get': 'dashboard',
        'install.post': 'install',
        'installed.get': 'installed',
        'login.post': 'login',
        'logout.post': 'logout',
        'logout-all.post': 'logout-all',
        'logout-others.post': 'logout-others',
        'pages.get': 'pages',
        'previews.get': 'previews',
        'process-job.post': 'process-job',
        'profile.get': 'profile',
        'profile.patch': 'profile',
        'renew-token.post': 'renew-token',
        'robots.txt.get': 'robots.txt',
        'sitemap.xml.get': 'sitemap.xml',
        'translatable-strings.get': 'translatable-strings',
        '*': true,
      },
    },
    catchAllPages: true,
    customCapabilities: [],
    dashboard: {
      baseComponents: {
        'collections/overview': undefined,
        'collections/record': undefined,
        'head': undefined,
        'header/logo': undefined,
        'install': undefined,
        'login': undefined,
        'login/logo': undefined,
        'logout': undefined,
        'media': undefined,
        'misc': {
          AddBlockPopup: undefined,
          Base: undefined,
          BlockTreeItem: undefined,
          BooleanFieldPreview: undefined,
          CollectionsContentRecord: undefined,
          CollectionsSimpleRecord: undefined,
          CollectionTranslations: undefined,
          DateFormatField: undefined,
          DateTimeFormatField: undefined,
          Dialog: undefined,
          DragImage: undefined,
          FieldLayout: undefined,
          FieldLayoutTabs: undefined,
          FilterPopup: undefined,
          FilterRule: undefined,
          Globals: undefined,
          HistoryButtons: undefined,
          ImagePreview: undefined,
          InputError: undefined,
          LegalLinks: undefined,
          LoadingIndicator: undefined,
          Logo: undefined,
          LogoFull: undefined,
          MediaBreadcrumbs: undefined,
          MediaDirectoryPopup: undefined,
          MediaFileInput: undefined,
          MediaItemDirectory: undefined,
          MediaItemUpload: undefined,
          MediaLibrary: undefined,
          MediaLibraryPopup: undefined,
          MediaMovePopup: undefined,
          MediaMovePopupItem: undefined,
          MediaUploadPopup: undefined,
          MoreBlockOptionsPopup: undefined,
          MultiCollectionsOverview: undefined,
          Popup: undefined,
          QuickActions: undefined,
          SearchMedia: undefined,
          SearchRecords: undefined,
          SingleCollectionsOverview: undefined,
          StringFieldPreview: undefined,
          TableColumnsPopup: undefined,
          TablePagination: undefined,
          TableSorter: undefined,
          Toaster: undefined,
          TranslationsFieldPreview: undefined,
          UnsavedChanges: undefined,
        },
      },
      enabled: true,
      legalLinks: [],
      prefix: 'dashboard',
      removeSiteStyles: true,
    },
    database: 'sqlite:./pruvious.db',
    jobs: { searchInterval: 60 },
    jwt: {
      expiration: '4 hours',
      expirationLong: '7 days',
      renewInterval: 30,
      secretKey: nanoid(64),
      localStorageKey: 'token',
    },
    language: {
      supported: [],
      primary: 'en',
      localStorageKey: 'language',
    },
    migration: true,
    pageCache: { type: 'local', path: './.cache/pages' },
    redis: false,
    singleCollectionsTable: 'single_collections',
    standardCollections: {
      pages: true,
      presets: true,
      previews: true,
      redirects: true,
      roles: true,
      seo: true,
      uploads: true,
      users: true,
    },
    standardFields: {
      'block': true,
      'button-group': true,
      'checkbox': true,
      'checkboxes': true,
      'chips': true,
      'date': true,
      'date-range': true,
      'date-time': true,
      'date-time-range': true,
      'editor': true,
      'file': true,
      'icon': true,
      'image': true,
      'link': true,
      'number': true,
      'range': true,
      'record': true,
      'records': true,
      'repeater': true,
      'select': true,
      'size': true,
      'slider': true,
      'slider-range': true,
      'switch': true,
      'text': true,
      'text-area': true,
      'time': true,
      'time-range': true,
    },
    standardHooks: {
      redirects: true,
    },
    standardJobs: {
      'clean-expired-previews': true,
      'clean-expired-tokens': true,
      'publish-pages': true,
    },
    standardMiddleware: {
      client: {
        auth: true,
      },
      server: {
        auth: true,
        config: true,
        language: true,
      },
    },
    standardTranslatableStrings: {
      dashboard: true,
      server: true,
    },
    uploads: {
      drive: {
        type: 'local',
        path: './.uploads',
        urlPrefix: 'uploads',
      },
      maxFileSize: '16 MB',
    },
  },
  async setup(options, nuxt) {
    /*
    |--------------------------------------------------------------------------
    | Init
    |--------------------------------------------------------------------------
    |
    */
    if (!semver.satisfies(nuxt._version, '3.15')) {
      warn(
        `This version of Pruvious is compatible with Nuxt $c{{ 3.15.x }}. You are currently using Nuxt $y{{ ${nuxt._version} }}.`,
      )
    }

    initModulePathResolver(createResolver(import.meta.url))
    initRootDir(nuxt.options.rootDir)
    cacheLayerPaths(nuxt.options._layers.map(({ cwd, config }) => path.resolve(cwd, config.rootDir)))
    fs.emptyDirSync(resolveAppPath('./.pruvious'))

    for (const [name, componentPath] of Object.entries(options.dashboard.baseComponents!)) {
      if (name === 'misc') {
        for (const [miscName, miscComponentPath] of Object.entries(componentPath as any)) {
          ;(options.dashboard.baseComponents!.misc as any)[miscName] = miscComponentPath
            ? resolveLayerPath(miscComponentPath as string)
            : resolveRelativeModulePath('./runtime/components/misc', `${miscName}.vue`)
        }
      } else {
        ;(options.dashboard.baseComponents! as any)[name] = componentPath
          ? resolveLayerPath(componentPath as string)
          : resolveRelativeModulePath('./runtime/components/dashboard', `${pascalCase(name)}.vue`)
      }
    }

    nuxt.options.runtimeConfig.pruvious = mergeDefaults(nuxt.options.runtimeConfig.pruvious as any, {
      catchAllPages: options.catchAllPages,
      customCapabilities: options.customCapabilities,
      dashboard: options.dashboard,
      database: options.database,
      jwt: options.jwt,
      jobs: options.jobs,
      migration: options.migration,
      pageCache: options.pageCache,
      redis: options.redis as any,
      singleCollectionsTable: options.singleCollectionsTable,
      standardCollections: options.standardCollections,
      standardFields: options.standardFields,
      standardHooks: options.standardHooks,
      standardJobs: options.standardJobs,
      standardMiddleware: options.standardMiddleware,
      standardTranslatableStrings: options.standardTranslatableStrings,
      uploads: options.uploads as any,
      uploadsDir:
        options.uploads.drive?.type === 'local'
          ? resolveRelativeAppPath(options.uploads.drive.path ?? './.uploads')
          : undefined,
    })

    nuxt.options.runtimeConfig.public.pruvious = mergeDefaults(nuxt.options.runtimeConfig.public.pruvious as any, {
      api: options.api,
      dashboardPrefix: options.dashboard.prefix,
      dashboardRemoveSiteStyles: options.dashboard.removeSiteStyles,
      jwtRenewInterval: options.jwt.renewInterval,
      jwtLocalStorageKey: options.jwt.localStorageKey,
      language: options.language as any,
      uploadLimit: isString(options.uploads.maxFileSize)
        ? parse(options.uploads.maxFileSize)
        : options.uploads.maxFileSize ?? parse('16 MB'),
    })

    patchModuleOptions(nuxt.options.runtimeConfig)
    cacheModuleOptions(nuxt.options.runtimeConfig)
    const moduleOptions = getModuleOptions()

    /*
    |--------------------------------------------------------------------------
    | Client middleware
    |--------------------------------------------------------------------------
    |
    */
    if (moduleOptions.standardMiddleware.client.auth) {
      addRouteMiddleware(
        {
          name: 'pruvious-auth',
          path: resolveModulePath('./runtime/middleware/client/auth'),
          global: moduleOptions.standardMiddleware.client.auth,
        },
        { override: true },
      )
    }

    /*
    |--------------------------------------------------------------------------
    | Server middleware
    |--------------------------------------------------------------------------
    |
    */
    for (const middleware of ['config', 'language', 'auth']) {
      if (moduleOptions.standardMiddleware.server[middleware]) {
        addServerHandler({
          route: '',
          middleware: true,
          handler: resolveModulePath(`./runtime/middleware/server/${middleware}`),
        })
      }
    }

    /*
    |--------------------------------------------------------------------------
    | API routes
    |--------------------------------------------------------------------------
    |
    */
    if (moduleOptions.api.routes!.collections) {
      addServerHandler({
        route: joinRouteParts(moduleOptions.api.prefix!, moduleOptions.api.routes!.collections, '**'),
        handler: resolveModulePath('./runtime/api/collections'),
      })
    }

    for (const route of [
      'clear-cache.post',
      'dashboard.get',
      'install.post',
      'installed.get',
      'login.post',
      'logout.post',
      'logout-all.post',
      'logout-others.post',
      'process-job.post',
      'profile.get',
      'profile.patch',
      'renew-token.post',
    ]) {
      if ((moduleOptions.api.routes! as any)[route]) {
        addServerHandler({
          route: joinRouteParts(moduleOptions.api.prefix!, (moduleOptions.api.routes! as any)[route]),
          handler: resolveModulePath(`./runtime/api/${route}`),
        })
      }
    }

    if (moduleOptions.api.routes!['pages.get']) {
      if (moduleOptions.api.prefix!) {
        addServerHandler({
          route: joinRouteParts(moduleOptions.api.prefix!, moduleOptions.api.routes!['pages.get']),
          handler: resolveModulePath('./runtime/api/pages.get'),
        })

        addServerHandler({
          route: joinRouteParts(moduleOptions.api.prefix!, moduleOptions.api.routes!['pages.get'], '**'),
          handler: resolveModulePath('./runtime/api/pages.get'),
        })
      }
    }

    if (moduleOptions.api.routes!['previews.get']) {
      if (moduleOptions.api.prefix!) {
        addServerHandler({
          route: joinRouteParts(moduleOptions.api.prefix!, moduleOptions.api.routes!['previews.get']),
          handler: resolveModulePath('./runtime/api/previews.get'),
        })

        addServerHandler({
          route: joinRouteParts(moduleOptions.api.prefix!, moduleOptions.api.routes!['previews.get'], '**'),
          handler: resolveModulePath('./runtime/api/previews.get'),
        })
      }
    }

    if (moduleOptions.api.routes!['translatable-strings.get']) {
      if (moduleOptions.api.prefix!) {
        addServerHandler({
          route: joinRouteParts(moduleOptions.api.prefix!, moduleOptions.api.routes!['translatable-strings.get']),
          handler: resolveModulePath('./runtime/api/translatable-strings.get'),
        })

        addServerHandler({
          route: joinRouteParts(
            moduleOptions.api.prefix!,
            moduleOptions.api.routes!['translatable-strings.get'],
            ':domain',
          ),
          handler: resolveModulePath('./runtime/api/translatable-strings.get'),
        })
      }
    }

    if (moduleOptions.api.routes!['*']) {
      if (moduleOptions.api.prefix!) {
        addServerHandler({
          route: joinRouteParts(moduleOptions.api.prefix!),
          handler: resolveModulePath('./runtime/api/catch-all'),
        })
      }

      addServerHandler({
        route: joinRouteParts(moduleOptions.api.prefix!, '**'),
        handler: resolveModulePath('./runtime/api/catch-all'),
      })
    }

    /*
    |--------------------------------------------------------------------------
    | Pages
    |--------------------------------------------------------------------------
    |
    */
    extendPages((pages) => {
      if (moduleOptions.dashboard.enabled) {
        pages.push({
          name: 'pruvious-dashboard',
          path: joinRouteParts(moduleOptions.dashboard.prefix!, ':catchAll(.*)?'),
          file: resolveModulePath('./runtime/pages/dashboard/index.vue'),
        })
      }

      if (moduleOptions.api.routes['pages.get'] && moduleOptions.catchAllPages) {
        pages.push({
          name: 'pruvious-page',
          path: '/:catchAll(.*)',
          file: resolveModulePath('./runtime/pages/[...slug].vue'),
        })
      }
    })

    /*
    |--------------------------------------------------------------------------
    | SEO
    |--------------------------------------------------------------------------
    |
    */
    if (moduleOptions.api.routes!['robots.txt.get']) {
      addServerHandler({
        route: joinRouteParts(moduleOptions.api.routes!['robots.txt.get']),
        handler: resolveModulePath('./runtime/api/robots.get'),
      })
    }

    if (moduleOptions.api.routes!['sitemap.xml.get']) {
      addServerHandler({
        route: joinRouteParts(moduleOptions.api.routes!['sitemap.xml.get']),
        handler: resolveModulePath('./runtime/api/sitemap.get'),
      })

      addServerHandler({
        route: joinRouteParts(moduleOptions.api.routes!['sitemap.xml.get'], ':index'),
        handler: resolveModulePath('./runtime/api/sitemap.get'),
      })
    }

    /*
    |--------------------------------------------------------------------------
    | Hooks
    |--------------------------------------------------------------------------
    |
    */
    nuxt.hook('build:manifest', (manifest) => {
      for (const item of Object.values(manifest)) {
        if (item.isEntry || item.isDynamicEntry) {
          item.dynamicImports = []
        }
      }
    })
    nuxt.hook('builder:watch', watchPruviousFiles)
    nuxt.hook('components:dirs', (dirs) => {
      if (options.standardFields.icon) {
        dirs.unshift({ path: resolveAppPath('./icons'), prefix: 'Icon' })
      }

      dirs.unshift(
        { path: resolveModulePath('./runtime/components/icons'), prefix: 'PruviousIcon' },
        { path: resolveModulePath('./runtime/components/misc'), prefix: 'Pruvious' },
        { path: resolveAppPath('./blocks') },
      )

      for (const layer of moduleOptions.layers) {
        if (fs.existsSync(path.resolve(layer, 'blocks'))) {
          dirs.unshift({ path: path.resolve(layer, 'blocks') })
        }
      }
    })
    nuxt.hook('nitro:config', (config) => {
      if (moduleOptions.dashboard.enabled) {
        config.routeRules ||= {}
        config.routeRules[`/${moduleOptions.dashboard.prefix}/**`] = { ssr: false }
      }
    })
    nuxt.hook('ready', boot)
    nuxt.hook('vite:extendConfig', (config) => {
      config.optimizeDeps = defu(config.optimizeDeps ?? {}, {
        needsInterop: ['vue-slider-component'],
        include: ['vue-slider-component'],
      })
    })

    if (moduleOptions.uploads) {
      nuxt.hook('nitro:init', (nitro) => {
        nitro.hooks.addHooks({ 'dev:reload': () => require('sharp') })
      })
    }

    /*
    |--------------------------------------------------------------------------
    | Other
    |--------------------------------------------------------------------------
    |
    */
    nuxt.options.alias['#pruvious'] = resolveAppPath('./.pruvious')
    nuxt.options.ignore ||= []
    nuxt.options.pages = true

    const dbInfo = getDatabaseInfo()

    if (dbInfo.dialect === 'sqlite') {
      nuxt.options.ignore.push('**/' + path.basename(dbInfo.storage))
      nuxt.options.ignore.push('**/' + `${path.basename(dbInfo.storage)}-journal`)
    }

    if (moduleOptions.uploads.drive.type === 'local') {
      const uploadsDir = getModuleOption('uploadsDir')
      const symDir = path.join(
        nuxt.options.rootDir,
        nuxt.options.dir.public,
        moduleOptions.uploads.drive.urlPrefix ?? 'uploads',
      )
      fs.ensureDirSync(uploadsDir)
      fs.removeSync(symDir)

      if (isDevelopment || isTest) {
        fs.ensureSymlinkSync(uploadsDir, symDir, 'junction')
      }

      nuxt.options.ignore.push('**/' + path.basename(moduleOptions.uploads.drive.path ?? './uploads') + '/**/*')
    }

    addServerPlugin(resolveModulePath('./runtime/plugins/page-cache'))
    validateLanguageOptions()
    createComponentDirectories()
  },
})
