import type { RuntimeConfig } from '@nuxt/schema'
import type { ModuleOptions } from '../module-types'
import { patchModuleOptions } from '../utils/module-options'
import { deepClone, deepMerge } from '../utils/object'

type OptionName = Pick<
  ModuleOptions,
  | 'api'
  | 'catchAllPages'
  | 'customCapabilities'
  | 'dashboard'
  | 'database'
  | 'jobs'
  | 'jwt'
  | 'language'
  | 'migration'
  | 'pageCache'
  | 'redis'
  | 'singleCollectionsTable'
  | 'standardCollections'
  | 'standardFields'
  | 'standardHooks'
  | 'standardJobs'
  | 'standardMiddleware'
  | 'standardTranslatableStrings'
  | 'uploads'
> & {
  baseUrl: string
  layers: string[]
  uploadsDir: string
}

export const intervals: NodeJS.Timer[] = []

let booting = true
let optionsInitialized = false

const moduleOptions: Record<keyof OptionName, any> = {
  api: '',
  baseUrl: '',
  catchAllPages: true,
  customCapabilities: [],
  dashboard: {},
  database: '',
  jobs: {},
  jwt: {},
  language: {},
  layers: [],
  migration: {},
  pageCache: true,
  redis: false,
  singleCollectionsTable: '',
  standardCollections: {},
  standardFields: {},
  standardHooks: {},
  standardJobs: {},
  standardMiddleware: {},
  standardTranslatableStrings: {},
  uploads: {},
  uploadsDir: '',
}

export function bootingFinished() {
  booting = false
}

export function isBooting() {
  return booting
}

export function cacheModuleOptions(runtimeConfig: RuntimeConfig) {
  if (!optionsInitialized) {
    const config = deepClone(runtimeConfig)

    patchModuleOptions(config)
    deepMerge(moduleOptions, {
      api: config.public.pruvious.api,
      baseUrl: runtimeConfig.app.baseURL,
      catchAllPages: config.pruvious.catchAllPages,
      customCapabilities: config.pruvious.customCapabilities,
      dashboard: config.pruvious.dashboard,
      database: config.pruvious.database,
      jobs: config.pruvious.jobs,
      jwt: config.pruvious.jwt,
      language: config.public.pruvious.language as any,
      migration: config.pruvious.migration,
      pageCache: config.pageCache,
      redis: config.pruvious.redis as any,
      singleCollectionsTable: config.pruvious.singleCollectionsTable,
      standardCollections: config.pruvious.standardCollections,
      standardFields: config.pruvious.standardFields,
      standardHooks: config.pruvious.standardHooks,
      standardJobs: config.pruvious.standardJobs,
      standardMiddleware: config.pruvious.standardMiddleware,
      standardTranslatableStrings: config.pruvious.standardTranslatableStrings,
      uploads: config.pruvious.uploads,
      uploadsDir: (config.pruvious as any).uploadsDir,
    })

    optionsInitialized = true
  }
}

export function cacheLayerPaths(layers: string[]) {
  moduleOptions.layers = layers
}

export function getModuleOption<T extends keyof OptionName>(option: T): Required<OptionName[T]> {
  return moduleOptions[option]
}

export function getModuleOptions() {
  return deepClone(moduleOptions)
}
