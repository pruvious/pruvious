import type { WatchEvent } from '@nuxt/schema'
import fs from 'fs-extra'
import path from 'path'
import { debounce } from 'perfect-debounce'
import { generateBlockTypes, generateBlocks } from './blocks/block.generator'
import { clearCachedBlock, resolveBlocks } from './blocks/block.resolver'
import { generateCollections } from './collections/collection.generator'
import { clearCachedCollection, resolveCollections } from './collections/collection.resolver'
import { generateDashboardPages } from './dashboard/dashboard.generator'
import { clearCachedDashboardPages, resolveDashboardPages } from './dashboard/dashboard.resolver'
import { generateFields } from './fields/field.generator'
import { clearCachedField, resolveFields } from './fields/field.resolver'
import { generateHooks } from './hooks/hook.generator'
import { clearCachedHook, resolveHooks } from './hooks/hook.resolver'
import { generateIcons } from './icons/icon.generator'
import { rebuildDatabase } from './instances/database'
import { clearAppEvalCache, clearEvalCache } from './instances/evaluator'
import { applyFormats, clearLogQueue, error, info, logger, processLogQueue, success } from './instances/logger'
import { resolveAppPath, resolveModulePath } from './instances/path'
import { bootingFinished, getModuleOption } from './instances/state'
import { generateJobs } from './jobs/job.generator'
import { clearCachedJob, resolveJobs } from './jobs/job.resolver'
import { generateLayouts } from './layouts/layout.generator'
import { clearCachedLayout, resolveLayouts } from './layouts/layout.resolver'
import { generateTranslatableStrings } from './translatable-strings/translatable-strings.generator'
import {
  clearCachedTranslatableStrings,
  resolveTranslatableStrings,
} from './translatable-strings/translatable-strings.resolver'
import { CodeGenerator } from './utils/code-generator'
import { relativeDotPruviousImport, walkDir, write } from './utils/fs'
import { deepMerge } from './utils/object'
import { pascalCase, titleCase } from './utils/string'
import { unifyLiteralStrings, unifyLiterals } from './utils/typescript'

const prevChange: [string, string] | [] = []
const icons: Record<string, string> = {}

let prevFieldsAndCollections = ''
let iconTypes = ''

/**
 * Regenerate the contents of the `.pruvious` directory.
 *
 * Logging is enabled by default.
 *
 * The `penalty` parameter adds time in milliseconds to the resulting generation time.
 *
 * @returns The log message and the time required for generating the contents.
 */
export async function generateDotPruvious(
  log = true,
  penalty = 0,
): Promise<{ time: number; level: 'info' | 'success'; message: string }> {
  const start = performance.now()

  if (log) {
    clearLogQueue()
  }

  const tsPreflight = new CodeGenerator()
  const tsIndex = new CodeGenerator()
  const tsServer = new CodeGenerator()
  const tsStandard = new CodeGenerator()
  const tsClient = new CodeGenerator()
  const tsDashboard = new CodeGenerator()
  const tsDashboardIcons = new CodeGenerator()
  const tsIcons = new CodeGenerator()

  const languages = getModuleOption('language').supported.map(({ code }) => code)
  const customCapabilities = [
    ...getModuleOption('customCapabilities'),
    'access-dashboard',
    'clear-cache',
    'update-profile',
  ]

  write(
    resolveAppPath('./.pruvious', 'preflight.ts'),
    fs.existsSync(resolveAppPath('./.pruvious', 'index.ts'))
      ? "export * from './index'\n"
      : tsPreflight
          .newDecl(`export const supportedLanguages = [${languages.map((l) => `'${l}'`).join(', ')}]`)
          .newDecl(`export const primaryLanguage = '${getModuleOption('language').primary}'`)
          .newDecl(
            `export const languageLabels = [${getModuleOption('language')
              .supported.map(({ name, code }) => `{ name: '${name}', code: '${code}' }`)
              .join(', ')}]`,
          )
          .newDecl(
            `export const prefixPrimaryLanguage = ${getModuleOption('language').prefixPrimary ? 'true' : 'false'}`,
          )
          .newDecl(`export const collectionCapabilities: CollectionCapability[] = []`)
          .newDecl(`export const userCapabilities: UserCapability[] = []`)
          .newDecl(`export const layouts: Pick<LayoutDefinition, 'name' | 'label'>[] = []`)
          .getContent(),
  )

  const fields = resolveFields()
  const collections = resolveCollections()
  const hooks = resolveHooks()
  const translatableStrings = resolveTranslatableStrings()
  const blocks = await resolveBlocks(fields.records, !!fields.errors)
  const layouts = await resolveLayouts()
  const jobs = resolveJobs()
  const dashboardPages = resolveDashboardPages()
  const errors =
    fields.errors + collections.errors + hooks.errors + translatableStrings.errors + blocks.errors + layouts.errors

  tsIndex
    .newDecl(`import 'h3'`)
    .newLine(`import type { PropType } from 'vue'`)
    .newDecl(`export type AuthUser = Omit<PopulatedFieldType['users'], 'password'>`)
    .newDecl(`export type SupportedLanguage = ${unifyLiteralStrings(...languages)}`)
    .newLine(`export type PrimaryLanguage = '${getModuleOption('language').primary}'`)
    .newDecl(`export const supportedLanguages: SupportedLanguage[] = [${languages.map((l) => `'${l}'`).join(', ')}]`)
    .newLine(`export const primaryLanguage = '${getModuleOption('language').primary}'`)
    .newLine(`export const prefixPrimaryLanguage = ${getModuleOption('language').prefixPrimary ? 'true' : 'false'}`)
    .newDecl(
      `export const languageLabels: { name: string, code: SupportedLanguage }[] = [${getModuleOption('language')
        .supported.map(({ name, code }) => `{ name: '${name}', code: '${code}' }`)
        .join(', ')}]`,
    )
    .newDecl(`declare module 'h3' {`)
    .newLine(`interface H3EventContext {`)
    .newLine(`auth: { isLoggedIn: true, user: AuthUser } | { isLoggedIn: false, user: null }`)
    .newLine(`language: SupportedLanguage`)
    .newLine(`}`)
    .newLine(`}`)
    .newDecl(`import type { Booleanish } from '${relativeDotPruviousImport('./runtime/utility-types')}'`)
    .newDecl(`export * from '${relativeDotPruviousImport('./runtime/utility-types')}'`)
    .newLine(`export * from '${relativeDotPruviousImport('./runtime/utils/array')}'`)
    .newLine(`export * from '${relativeDotPruviousImport('./runtime/utils/common')}'`)
    .newLine(`export * from '${relativeDotPruviousImport('./runtime/utils/conditional-logic')}'`)
    .newLine(`export * from '${relativeDotPruviousImport('./runtime/utils/dom')}'`)
    .newLine(`export * from '${relativeDotPruviousImport('./runtime/utils/function')}'`)
    .newLine(`export * from '${relativeDotPruviousImport('./runtime/utils/number')}'`)
    .newLine(`export * from '${relativeDotPruviousImport('./runtime/utils/object')}'`)
    .newLine(`export * from '${relativeDotPruviousImport('./runtime/utils/query-string')}'`)
    .newLine(`export * from '${relativeDotPruviousImport('./runtime/utils/slugify')}'`)
    .newLine(`export * from '${relativeDotPruviousImport('./runtime/utils/string')}'`)
    .newLine(`export * from '${relativeDotPruviousImport('./runtime/utils/translatable-strings')}'`)
    .newLine(`export * from '${relativeDotPruviousImport('./runtime/utils/typescript')}'`)
    .newLine(`export * from '${relativeDotPruviousImport('./runtime/utils/uploads')}'`)
    .newLine(`export * from '${relativeDotPruviousImport('./runtime/utils/users')}'`)
    .newDecl(`export type UserCapability = `)
    .add(unifyLiterals(...customCapabilities.map((c) => `'${c}'`), 'CollectionCapability'))

  tsClient
    .newDecl(`export * from '${relativeDotPruviousImport('./runtime/composables/auth')}'`)
    .newLine(`export * from '${relativeDotPruviousImport('./runtime/composables/collection')}'`)
    .newLine(`export * from '${relativeDotPruviousImport('./runtime/composables/language')}'`)
    .newLine(`export * from '${relativeDotPruviousImport('./runtime/composables/page')}'`)
    .newLine(`export * from '${relativeDotPruviousImport('./runtime/composables/token')}'`)
    .newLine(`export * from '${relativeDotPruviousImport('./runtime/composables/translatable-strings')}'`)
    .newLine(`export * from '${relativeDotPruviousImport('./runtime/composables/unique')}'`)
    .newLine(`export * from '${relativeDotPruviousImport('./runtime/composables/user')}'`)
    .newLine(`export * from '${relativeDotPruviousImport('./runtime/utils/fetch')}'`)

  tsServer
    .newDecl(`export { cache } from '${relativeDotPruviousImport('./runtime/instances/cache')}'`)
    .newLine(`export { db } from '${relativeDotPruviousImport('./runtime/instances/database')}'`)
    .newLine(
      `export { s3Client, s3PutObject, s3GetObject, s3MoveObject, s3DeleteObject } from '${relativeDotPruviousImport(
        './runtime/instances/s3',
      )}'`,
    )
    .newLine(`export * from '${relativeDotPruviousImport('./runtime/http/auth')}'`)
    .newLine(
      `export { cacheModuleOptions, getModuleOption } from '${relativeDotPruviousImport('./runtime/instances/state')}'`,
    )
    .newDecl(`export { clearPageCache } from '${relativeDotPruviousImport('./runtime/plugins/page-cache')}'`)
    .newDecl(`export * from '${relativeDotPruviousImport('./runtime/sanitizers/booleanish')}'`)
    .newLine(`export * from '${relativeDotPruviousImport('./runtime/sanitizers/default')}'`)
    .newLine(`export * from '${relativeDotPruviousImport('./runtime/sanitizers/numeric')}'`)
    .newLine(`export * from '${relativeDotPruviousImport('./runtime/sanitizers/string')}'`)
    .newLine(`export * from '${relativeDotPruviousImport('./runtime/sanitizers/unique-array')}'`)
    .newLine(`export * from '${relativeDotPruviousImport('./runtime/validators/array')}'`)
    .newLine(`export * from '${relativeDotPruviousImport('./runtime/validators/boolean')}'`)
    .newLine(`export * from '${relativeDotPruviousImport('./runtime/validators/number')}'`)
    .newLine(`export * from '${relativeDotPruviousImport('./runtime/validators/object')}'`)
    .newLine(`export * from '${relativeDotPruviousImport('./runtime/validators/present')}'`)
    .newLine(`export * from '${relativeDotPruviousImport('./runtime/validators/required')}'`)
    .newLine(`export * from '${relativeDotPruviousImport('./runtime/validators/string')}'`)
    .newLine(`export * from '${relativeDotPruviousImport('./runtime/validators/unique')}'`)
    .newLine(`export * from '${relativeDotPruviousImport('./runtime/utils/server/pages')}'`)

  tsDashboard
    .newDecl(`// @ts-nocheck`)
    .newLine(`import { defineAsyncComponent } from '#imports'`)
    .newDecl(`export * from '${relativeDotPruviousImport('./runtime/composables/dashboard/clipboard.ts')}'`)
    .newDecl(`export * from '${relativeDotPruviousImport('./runtime/composables/dashboard/collection-language.ts')}'`)
    .newDecl(`export * from '${relativeDotPruviousImport('./runtime/composables/dashboard/confirm-click.ts')}'`)
    .newDecl(`export * from '${relativeDotPruviousImport('./runtime/composables/dashboard/dashboard.ts')}'`)
    .newDecl(`export * from '${relativeDotPruviousImport('./runtime/composables/dashboard/dialog.ts')}'`)
    .newDecl(`export * from '${relativeDotPruviousImport('./runtime/composables/dashboard/fetch-count.ts')}'`)
    .newDecl(`export * from '${relativeDotPruviousImport('./runtime/composables/dashboard/hotkeys.ts')}'`)
    .newDecl(`export * from '${relativeDotPruviousImport('./runtime/composables/dashboard/media.ts')}'`)
    .newDecl(`export * from '${relativeDotPruviousImport('./runtime/composables/dashboard/move.ts')}'`)
    .newDecl(`export * from '${relativeDotPruviousImport('./runtime/composables/dashboard/redirects-test.ts')}'`)
    .newDecl(`export * from '${relativeDotPruviousImport('./runtime/composables/dashboard/search.ts')}'`)
    .newDecl(`export * from '${relativeDotPruviousImport('./runtime/composables/dashboard/toaster.ts')}'`)
    .newDecl(`export * from '${relativeDotPruviousImport('./runtime/composables/dashboard/unsaved-changes.ts')}'`)

  for (const [componentName, relativeComponentPath] of Object.entries(getModuleOption('dashboard').baseComponents)) {
    if (componentName !== 'misc') {
      const componentPath = path.resolve(relativeComponentPath as string)

      tsDashboard
        .newDecl(
          `export const dashboard${pascalCase(
            componentName,
          )}ComponentImport = () => import('${relativeDotPruviousImport(componentPath)}')`,
        )
        .newLine(
          `export const dashboard${pascalCase(
            componentName,
          )}Component = () => defineAsyncComponent(() => import('${relativeDotPruviousImport(componentPath)}'))`,
        )
    }
  }

  const dashboardMiscComponentPaths: Record<string, string> = {}
  tsDashboard.newDecl(`export const dashboardMiscComponentImport = {`)
  for (const [componentName, relativeComponentPath] of Object.entries(
    getModuleOption('dashboard').baseComponents.misc ?? {},
  )) {
    dashboardMiscComponentPaths[componentName] = path.resolve(relativeComponentPath)
    tsDashboard.newLine(
      `'${componentName}': () => import('${relativeDotPruviousImport(dashboardMiscComponentPaths[componentName])}'),`,
    )
  }
  tsDashboard.newLine(`}`)

  tsDashboard.newDecl(`export const dashboardMiscComponent = {`)
  for (const componentName of Object.keys(dashboardMiscComponentPaths)) {
    tsDashboard.newLine(
      `'${componentName}': () => defineAsyncComponent(() => import('${relativeDotPruviousImport(
        dashboardMiscComponentPaths[componentName],
      )}')),`,
    )
  }
  tsDashboard.newLine(`}`)

  if (!Object.keys(icons).length) {
    for (const { file, fullPath } of walkDir(resolveModulePath('./runtime/components/icons'))) {
      icons[file.replace(/\.vue$/, '')] = fs.readFileSync(fullPath, 'utf-8').replace(/<\/?template>/g, '')
    }

    iconTypes = unifyLiteralStrings(...Object.keys(icons))
  }

  tsDashboardIcons.newDecl(`export const dashboardIcons = {`)
  for (const [name, svg] of Object.entries(icons)) {
    tsDashboardIcons.newLine(`'${name}': \`${svg}\`,`)
  }
  tsDashboardIcons.newDecl(`}`)

  generateTranslatableStrings(translatableStrings.records, tsIndex, tsServer, tsStandard)
  generateFields(fields.records, tsIndex, tsServer, tsStandard, tsDashboard)
  generateBlocks(blocks.records, tsIndex, tsServer)
  generateIcons(tsIndex, tsIcons)
  generateLayouts(layouts.records, tsIndex)
  generateCollections(collections.records, fields.records, tsIndex, tsServer, tsStandard, tsDashboard)
  generateHooks(hooks.records, tsIndex, tsServer)
  generateJobs(jobs.records, tsIndex, tsServer)
  generateDashboardPages(dashboardPages.records, tsIndex, tsServer, tsDashboard)
  await generateBlockTypes(blocks.records, fields.records, tsIndex)

  tsIndex
    .newDecl(`export const userCapabilities: UserCapability[] = [`)
    .add(customCapabilities.length ? customCapabilities.map((capability) => `'${capability}'`).join(', ') + ', ' : '')
    .add(`...collectionCapabilities]`)
    .newDecl(
      `export const layouts: Pick<LayoutDefinition, 'name' | 'label'>[] = [${Object.values(layouts.records)
        .map(
          ({ definition }) =>
            `{ name: '${definition.name}', label: '${definition.label || titleCase(definition.name, false)}' }`,
        )
        .join(', ')}]`,
    )
    .newDecl(`export type PruviousIcon = ${iconTypes}`)
    .newDecl(`import type { SizeInput } from '${relativeDotPruviousImport('./runtime/input-types')}'`)
    .newLine(`export type { SizeInput }`)

  tsPreflight.clear().newDecl(`export * from './index'`)

  write(resolveAppPath('./.pruvious', 'index.ts'), tsIndex.getContent())
  write(resolveAppPath('./.pruvious', 'client.ts'), tsClient.getContent())
  write(resolveAppPath('./.pruvious', 'dashboard.ts'), tsDashboard.getContent())
  write(resolveAppPath('./.pruvious', 'dashboard-icons.ts'), tsDashboardIcons.getContent())
  write(resolveAppPath('./.pruvious', 'icons.ts'), tsIcons.getContent())
  write(resolveAppPath('./.pruvious', 'preflight.ts'), tsPreflight.getContent())
  write(resolveAppPath('./.pruvious', 'server.ts'), tsServer.getContent())
  write(resolveAppPath('./.pruvious', 'standard.ts'), tsStandard.getContent())

  const time = Math.round(performance.now() - start)

  if (!errors) {
    const stringifiedFieldsAndCollections = JSON.stringify([fields, collections])

    if (stringifiedFieldsAndCollections !== prevFieldsAndCollections) {
      await rebuildDatabase(
        Object.fromEntries(Object.entries(fields.records).map(([name, { definition }]) => [name, definition])),
        Object.fromEntries(Object.entries(collections.records).map(([name, { definition }]) => [name, definition])),
      )

      prevFieldsAndCollections = stringifiedFieldsAndCollections
    }
  }

  const message = errors
    ? `Pruvious built in ${time + penalty} ms with $r{{ ${errors} error${errors > 1 ? 's' : ''} }}`
    : `Pruvious built in ${time + penalty} ms`

  if (log) {
    processLogQueue()

    if (errors) {
      info(message)
    } else {
      success(message)
    }
  }

  return { time, level: errors ? 'info' : 'success', message }
}

const generateDotPruviousDebounced = debounce(
  async () => {
    const results = await generateDotPruvious(false)

    if (results.level !== 'success') {
      clearAppEvalCache()
      clearLogQueue()
      deepMerge(results, await generateDotPruvious(false, results.time))
    }

    processLogQueue()
    logger[results.level](applyFormats(results.message))
  },
  250,
  { leading: true, trailing: false },
)

/**
 * Boot Pruvious by generating the `.pruvious` directory (twice if needed) and launching job workers.
 */
export async function boot() {
  const dotPruviousPath = resolveAppPath('./.pruvious')
  const initialCode: string[] = []

  if (fs.existsSync(dotPruviousPath)) {
    for (const { fullPath } of walkDir(dotPruviousPath)) {
      initialCode.push(fs.readFileSync(fullPath, 'utf-8'))
    }
  }

  const results = await generateDotPruvious(false)
  const generatedCode: string[] = []

  bootingFinished()

  for (const { fullPath } of walkDir(dotPruviousPath)) {
    generatedCode.push(fs.readFileSync(fullPath, 'utf-8'))
  }

  if (initialCode.join('') !== generatedCode.join('')) {
    clearAppEvalCache()
    clearLogQueue()
    deepMerge(results, await generateDotPruvious(false, results.time))
  }

  processLogQueue()
  logger[results.level](applyFormats(results.message))
}

/**
 * Re-generate the contents of the dynamic `.pruvious` directory on file changes.
 */
export function watchPruviousFiles(event: WatchEvent, filePath: string) {
  setTimeout(() => {
    const resolvedPath = resolveAppPath(filePath)

    if (!resolvedPath.startsWith(resolveAppPath('./.pruvious'))) {
      try {
        if (event === 'add' || event === 'change') {
          const content = fs.readFileSync(resolvedPath, 'utf-8')

          if (prevChange[0] === resolvedPath && prevChange[1] === content) {
            return
          }

          prevChange.splice(0, 2, resolvedPath, content)
        } else {
          prevChange.splice(0, 2)
        }
      } catch {
        prevChange.splice(0, 2)
      }

      clearEvalCache(resolvedPath)
      clearCachedField(resolvedPath)
      clearCachedCollection(resolvedPath)
      clearCachedHook(resolvedPath)
      clearCachedTranslatableStrings(resolvedPath)
      clearCachedBlock(resolvedPath)
      clearCachedLayout(resolvedPath)
      clearCachedJob(resolvedPath)
      clearCachedDashboardPages(resolvedPath)

      generateDotPruviousDebounced()
    }
  })
}

/**
 * Validate language options, confirming the presence of at least one defined language
 * and ensuring the primary language is among the supported languages.
 */
export function validateLanguageOptions() {
  const options = getModuleOption('language')

  if (!options.supported.length) {
    error(`At least one language must be $c{{ supported }} within the CMS.`)
  } else if (!options.supported.some(({ code }) => code === options.primary)) {
    error(
      `The primary language code $c{{ ${options.primary} }} must be included in the list of $c{{ supported }} languages.`,
    )
  }
}

/**
 * Create the `blocks` and `icons` directory in the Nuxt app if absent.
 */
export function createComponentDirectories() {
  fs.ensureDirSync(resolveAppPath('./blocks'))

  if (getModuleOption('standardFields').icon) {
    fs.ensureDirSync(resolveAppPath('./icons'))
  }
}
