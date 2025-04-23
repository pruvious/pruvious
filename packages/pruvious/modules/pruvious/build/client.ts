import { validatorsMeta } from '@pruvious/orm'
import { camelCase } from '@pruvious/utils'
import fs from 'node:fs'
import { createResolver, useNuxt } from 'nuxt/kit'
import { relative } from 'pathe'
import { resolveBlockFiles } from '../blocks/resolver'
import { debug } from '../debug/console'
import { resolveFieldComponentFiles, resolveFieldDefinitionFiles } from '../fields/resolver'
import {
  resolveActionCallbackFiles,
  resolveActionDefinitionFiles,
  resolveFilterCallbackFiles,
  resolveFilterDefinitionFiles,
} from '../hooks/resolver'
import { resolveTranslationFiles } from '../translations/resolver'
import { getSimpleValidatorsMeta } from './validators'

/**
 * Generates the `#pruvious/client` files.
 */
export function generateClientFiles() {
  const nuxt = useNuxt()
  const buildDir = nuxt.options.runtimeConfig.pruvious.dir.build

  fs.writeFileSync(`${buildDir}/client/base.ts`, getClientBaseFileContent() + '\n')
  fs.writeFileSync(`${buildDir}/client/i18n.ts`, getClientI18nFileContent() + '\n')
  fs.writeFileSync(`${buildDir}/client/hooks.ts`, getClientHooksFileContent() + '\n')
  fs.writeFileSync(`${buildDir}/client/index.ts`, getClientFileContent() + '\n')
  fs.writeFileSync(`${buildDir}/client/index.d.ts`, getClientTypeFileContent() + '\n')
  fs.writeFileSync(`${buildDir}/client/dayjs.ts`, getClientDayjsFileContent() + '\n')
}

/**
 * Generates the `#pruvious/client/base.ts` file content.
 */
function getClientBaseFileContent() {
  const nuxt = useNuxt()
  const pruviousOptions = nuxt.options.runtimeConfig.pruvious

  debug(`Generating <${relative(nuxt.options.workspaceDir, pruviousOptions.dir.build)}/client/base.ts>`)

  return [
    `/**`,
    ` * The base path for the dashboard.`,
    ` * This setting comes from the Nuxt config \`pruvious.dashboard.basePath\` and is formatted to always start and end with a forward slash.`,
    ` */`,
    `export const dashboardBasePath = '${pruviousOptions.dashboard.basePath}'`,
    ``,
  ].join('\n')
}

/**
 * Generates the `#pruvious/client/i18n.ts` file content.
 */
function getClientI18nFileContent() {
  const nuxt = useNuxt()
  const pruviousOptions = nuxt.options.runtimeConfig.pruvious

  debug(`Generating <${relative(nuxt.options.workspaceDir, pruviousOptions.dir.build)}/client/i18n.ts>`)

  const { resolve } = createResolver(import.meta.url)
  const translationFiles = resolveTranslationFiles()
  const dashboardLanguages = Object.keys(translationFiles['pruvious-dashboard'] ?? {}).map((code) => ({
    code,
    name: new Intl.DisplayNames([code, 'en'], { type: 'language' }).of(code) ?? code,
  }))

  return [
    `import { I18n, type ExtractDomains, type ExtractHandlesByDomainAndLanguage, type ExtractInput, type ExtractTranslatableStringsDefinitions } from '@pruvious/i18n'`,
    `import type { i18n as _i18n, LanguageCode } from '../server'`,
    `import { useLanguage } from '${resolve('../translations/utils.client')}'`,
    ``,
    `/**`,
    ` * The \`I18n\` instance containing all translatable strings in the CMS.`,
    ` */`,
    `let i18nInstance: typeof _i18n | undefined`,
    ``,
    `/**`,
    ` * Array of all registered content languages in the CMS.`,
    ` */`,
    `export const languages = [`,
    ...Object.values(pruviousOptions.i18n.languages).map(({ code, name }) => `  { code: '${code}', name: '${name}' },`),
    `] as const`,
    ``,
    `/**`,
    ` * The primary content language used by the CMS.`,
    ` */`,
    `export const primaryLanguage = '${pruviousOptions.i18n.primaryLanguage}'`,
    ``,
    `/**`,
    ` * Array containing all supported languages for the dashboard interface.`,
    ` */`,
    `export const dashboardLanguages = [`,
    ...Object.values(dashboardLanguages).map(({ code, name }) => `  { code: '${code}', name: '${name}' },`),
    `] as const`,
    ``,
    `/**`,
    ` * Retrieves the \`I18n\` instance containing all translatable strings in the CMS.`,
    ` */`,
    `export function i18n(): typeof _i18n {`,
    `  if (!i18nInstance) {`,
    `    i18nInstance = new I18n().setFallbackLanguages([${pruviousOptions.i18n.fallbackLanguages.map((lang) => `'${lang}'`).join(', ')}]) as typeof _i18n`,
    `  }`,
    ``,
    `  return i18nInstance`,
    `}`,
    ``,
    `/**`,
    ` * Retrieves a translated string for a given \`domain\` and \`handle\`, with optional \`input\` parameters.`,
    ` * The language is automatically resolved from the current page language.`,
    ` *`,
    ` * @example`,
    ` * \`\`\`vue`,
    ` * <template>`,
    ` *   <div>{{ __('my-domain', 'Hello!') }}</div>`,
    ` * </template>`,
    ` *`,
    ` * <script lang="ts" setup>`,
    ` * import { __, preloadTranslatableStrings } from '#pruvious/client'`,
    ` *`,
    ` * // You can also preload custom translatable string domains in your Nuxt config:`,
    ` * // \`pruvious.i18n.preloadTranslatableStrings\``,
    ` * await preloadTranslatableStrings('my-domain')`,
    ` * </script>`,
    ` * \`\`\``,
    ` */`,
    `export function __<TDomain extends ExtractDomains<ExtractTranslatableStringsDefinitions<typeof _i18n>>, THandle extends ExtractHandlesByDomainAndLanguage<TDomain, string, ExtractTranslatableStringsDefinitions<typeof _i18n>>, TInput extends ExtractInput<TDomain, string, THandle & string, ExtractTranslatableStringsDefinitions<typeof _i18n>>>(domain: TDomain, handle: THandle, input?: TInput): string { return i18n().__$(domain, useLanguage().value, handle as any, input) }`,
    ``,
    `/**`,
    ` * A shorthand function for retrieving translated strings from the \`default\` domain.`,
    ` * This method is equivalent to calling \`__\` with \`default\` as the domain.`,
    ` * The language is automatically resolved from the current page language.`,
    ` *`,
    ` * @example`,
    ` * \`\`\`vue`,
    ` * <template>`,
    ` *   <div>{{ _('Hello, $name!', { name: 'Stranger' }) }}</div>`,
    ` * </template>`,
    ` *`,
    ` * <script lang="ts" setup>`,
    ` * import { _ } from '#pruvious/client'`,
    ` * </script>`,
    ` * \`\`\``,
    ` */`,
    `export function _<THandle extends ExtractHandlesByDomainAndLanguage<'default', string, ExtractTranslatableStringsDefinitions<typeof _i18n>>, TInput extends ExtractInput<'default', string, THandle & string, ExtractTranslatableStringsDefinitions<typeof _i18n>>>(handle: THandle, input?: TInput): string { return i18n().__$('default', useLanguage().value, handle as any, input) }`,
    ``,
    `/**`,
    ` * Verifies if a language \`code\` exists in the configured languages list.`,
    ` * The function checks against the language codes defined in the \`pruvious.i18n.languages\` array within \`nuxt.config.ts\`.`,
    ` */`,
    `export function isValidLanguageCode(code: unknown): code is LanguageCode {`,
    `  return languages.some((language) => language.code === code)`,
    `}`,
    ``,
  ].join('\n')
}

/**
 * Generates the `#pruvious/client/hooks.ts` file content.
 */
function getClientHooksFileContent() {
  const nuxt = useNuxt()
  const pruviousOptions = nuxt.options.runtimeConfig.pruvious

  debug(`Generating <${relative(nuxt.options.workspaceDir, pruviousOptions.dir.build)}/client/hooks.ts>`)

  const { resolve } = createResolver(import.meta.url)
  const actionDefinitionFiles = resolveActionDefinitionFiles()
  const clientActionDefinitionEntries = Object.entries(actionDefinitionFiles.client)
  const actionCallbackFiles = resolveActionCallbackFiles()
  const clientActionCallbackEntries = Object.entries(actionCallbackFiles.client)
  const filterDefinitionFiles = resolveFilterDefinitionFiles()
  const clientFilterDefinitionEntries = Object.entries(filterDefinitionFiles.client)
  const filterCallbackFiles = resolveFilterCallbackFiles()
  const clientFilterCallbackEntries = Object.entries(filterCallbackFiles.client)

  return [
    ...clientActionDefinitionEntries.map(
      ([name, { file }]) => `import type _${name.split(':').map(camelCase).join('_')}Action from '${file.import}'`,
    ),
    ...clientFilterDefinitionEntries.map(
      ([name, { file }]) => `import type _${name.split(':').map(camelCase).join('_')}Filter from '${file.import}'`,
    ),
    ``,
    `/**`,
    ` * Type representing all defined client-side action hooks.`,
    ` * The keys are the action names, and the values are the \`Action\` definition objects.`,
    ` */`,
    `export type Actions = {`,
    ...clientActionDefinitionEntries.map(
      ([name]) => `  '${name}': typeof _${name.split(':').map(camelCase).join('_')}Action,`,
    ),
    `}`,
    ``,
    `/**`,
    ` * Type representing all defined client-side filter hooks.`,
    ` * The keys are the filter names, and the values are the \`Filter\` definition objects.`,
    ` */`,
    `export type Filters = {`,
    ...clientFilterDefinitionEntries.map(
      ([name]) => `  '${name}': typeof _${name.split(':').map(camelCase).join('_')}Filter,`,
    ),
    `}`,
    ``,
    `/**`,
    ` * Stores all loaded client-side actions in a key-value structure.`,
    ` * The keys represent action names, and their values are arrays of objects containing the following properties:`,
    ` *`,
    ` * - \`callback\` - The action function to be executed.`,
    ` * - \`priority\` - The priority of the action.`,
    ` */`,
    `export const actions: Record<string, { callback: Function, priority: number }[]> = {}`,
    ``,
    `/**`,
    ` * Stores all loaded client-side filters in a key-value structure.`,
    ` * The keys represent filter names, and their values are arrays of objects containing the following properties:`,
    ` *`,
    ` * - \`callback\` - The filter function to be executed.`,
    ` * - \`priority\` - The priority of the filter.`,
    ` */`,
    `export const filters: Record<string, { callback: Function, priority: number }[]> = {}`,
    ``,
    `/**`,
    ` * Loads specific client-side actions by their action \`name\`.`,
    ` *`,
    ` * Actions are functions that allow you to hook into specific points in the application flow.`,
    ` * They provide a way to execute custom code without changing the original implementation.`,
    ` *`,
    ` * @example`,
    ` * \`\`\`ts`,
    ` * // app/hooks/actions/foo/before.ts`,
    ` * import { defineAction } from '#pruvious/client'`,
    ` *`,
    ` * export default defineAction<{ time: number }>()`,
    ` *`,
    ` * // app/hooks/actions/foo/after.ts`,
    ` * import { defineAction } from '#pruvious/client'`,
    ` *`,
    ` * export default defineAction<{ time: number }>()`,
    ` *`,
    ` * // app/actions/foo.ts`,
    ` * import { addAction } from '#pruvious/client'`,
    ` *`,
    ` * addAction('foo:before', ({ time }) => {`,
    ` *   // Do something`,
    ` * })`,
    ` *`,
    ` * addAction('foo:after', ({ time }) => {`,
    ` *   // Do something`,
    ` * })`,
    ` *`,
    ` * // app/utils/foo.ts`,
    ` * import { doActions, loadActions } from '#pruvious/client'`,
    ` *`,
    ` * await loadActions('foo:before', 'foo:after')`,
    ` *`,
    ` * export async function foo() {`,
    ` *   await doActions('foo:before', { time: performance.now() })`,
    ` *   // Do something`,
    ` *   await doActions('foo:after', { time: performance.now() })`,
    ` * }`,
    ` * \`\`\``,
    ` */`,
    `export async function loadActions<TName extends keyof Actions>(name: TName, ...additional: TName[]) {`,
    `  for (const action of [name, ...additional]) {`,
    ...clientActionCallbackEntries.flatMap(([name, locations]) => [
      `    if (action === '${name}' && !actions[action]) {`,
      ...locations.map(({ file }) => `      await import('${resolve(file.import)}')`),
      `    }`,
    ]),
    `  }`,
    `}`,
    ``,
    `/**`,
    ` * Loads specific client-side filters by their filter \`name\`.`,
    ` *`,
    ` * Filters are functions that allow modification of data at specific points in the application flow.`,
    ` * They provide a way to transform data without changing the original implementation.`,
    ` *`,
    ` * @example`,
    ` * // app/hooks/filters/foo/returnable.ts`,
    ` * import { defineFilter } from '#pruvious/client'`,
    ` *`,
    ` * export default defineFilter<string>()`,
    ` *`,
    ` * // app/filters/foo.ts`,
    ` * import { addFilter } from '#pruvious/client'`,
    ` *`,
    ` * addFilter('foo:returnable', (value) => {`,
    ` *   return value + ', world!'`,
    ` * })`,
    ` *`,
    ` * // app/utils/foo.ts`,
    ` * import { applyFilters, loadFilters } from '#pruvious/client'`,
    ` *`,
    ` * await loadFilters('foo:returnable')`,
    ` *`,
    ` * export async function foo() {`,
    ` *   const returnable = 'Hello'`,
    ` *   return applyFilters('foo:returnable', returnable, {})`,
    ` * }`,
    ` * \`\`\``,
    ` */`,
    `export async function loadFilters<TName extends keyof Filters>(name: TName, ...additional: TName[]) {`,
    `  for (const filter of [name, ...additional]) {`,
    ...clientFilterCallbackEntries.flatMap(([name, locations]) => [
      `    if (filter === '${name}' && !filters[filter]) {`,
      ...locations.map(({ file }) => `      await import('${resolve(file.import)}')`),
      `    }`,
    ]),
    `  }`,
    `}`,
    ``,
  ].join('\n')
}

/**
 * Generates the `#pruvious/client` file content.
 */
function getClientFileContent() {
  const nuxt = useNuxt()
  const pruviousOptions = nuxt.options.runtimeConfig.pruvious

  debug(`Generating <${relative(nuxt.options.workspaceDir, pruviousOptions.dir.build)}/client/index.ts>`)

  const fieldDefinitionFiles = resolveFieldDefinitionFiles()
  const fieldDefinitionEntries = Object.entries(fieldDefinitionFiles)
  const fieldComponentFiles = resolveFieldComponentFiles()
  const fieldComponentEntries = Object.entries(fieldComponentFiles)
  const blockFiles = resolveBlockFiles()
  const blockEntries = Object.entries(blockFiles)
  const simpleValidatorsMeta = getSimpleValidatorsMeta()

  return [
    `import { type Component, defineAsyncComponent } from 'vue'`,
    `import type { Blocks } from '../server'`,
    ...fieldDefinitionEntries.map(([name, { file }]) => `import type _${name}Field from '${file.import}'`),
    ``,
    `const _fieldFn = () => null`,
    ``,
    ...fieldDefinitionEntries.flatMap(([name]) => [
      `export const ${name}Field = _fieldFn as unknown as typeof _${name}Field.clientFn`,
    ]),
    ``,
    `/**`,
    ` * Key-value object mapping field names to their corresponding Vue components.`,
    ` * Each component provides editing functionality for a specific field type in the CMS.`,
    ` *`,
    ` * Components are loaded asynchronously using Vue's \`defineAsyncComponent\` function.`,
    ` * They are automatically registered by creating \`.vue\` files in the \`app/fields/\` directory of the project.`,
    ` *`,
    ` * Note: Always include a fallback component for any field that doesn't have a designated component assigned to it.`,
    ` *`,
    ` * @example`,
    ` * \`\`\`vue`,
    ` * <template>`,
    ` *   <component v-if="fieldComponents[fieldName]" :is="fieldComponents[fieldName]" v-model="props" />`,
    ` * </template>`,
    ` * \`\`\``,
    ` */`,
    `export const fieldComponents: Record<string, () => Component> = {`,
    ...fieldComponentEntries
      .filter(([_, { regular }]) => regular)
      .map(
        ([name, { regular }]) => `  '${name}': () => defineAsyncComponent(() => import('${regular!.file.absolute}')),`,
      ),
    `}`,
    ``,
    `/**`,
    ` * Key-value object mapping field names to their corresponding Vue components for table views.`,
    ` * These components are used to render field values in table cells.`,
    ` *`,
    ` * Components are loaded asynchronously using Vue's \`defineAsyncComponent\` function.`,
    ` * They are automatically registered by creating \`.table.vue\` files in the \`app/fields/\` directory of the project.`,
    ` *`,
    ` * Note: Always include a fallback component for any field that doesn't have a designated component assigned to it.`,
    ` *`,
    ` * @example`,
    ` * \`\`\`vue`,
    ` * <template>`,
    ` *   <component v-if="tableFieldComponents[fieldName]" :is="tableFieldComponents[fieldName]" v-model="props" />`,
    ` * </template>`,
    ` * \`\`\``,
    ` */`,
    `export const tableFieldComponents: Record<string, () => Component> = {`,
    ...fieldComponentEntries
      .filter(([_, { table }]) => table)
      .map(([name, { table }]) => `  '${name}': () => defineAsyncComponent(() => import('${table!.file.absolute}')),`),
    `}`,
    ``,
    `/**`,
    ` * Key-value object mapping field names to their corresponding Vue components for filter views.`,
    ` * These components are used to render field values in the data table filters.`,
    ` *`,
    ` * Components are loaded asynchronously using Vue's \`defineAsyncComponent\` function.`,
    ` * They are automatically registered by creating \`.filter.vue\` files in the \`app/fields/\` directory of the project.`,
    ` *`,
    ` * Note: Always include a fallback component for any field that doesn't have a designated component assigned to it.`,
    ` *`,
    ` * @example`,
    ` * \`\`\`vue`,
    ` * <template>`,
    ` *   <component v-if="filterFieldComponents[fieldName]" :is="filterFieldComponents[fieldName]" v-model="props" />`,
    ` * </template>`,
    ` * \`\`\``,
    ` */`,
    `export const filterFieldComponents: Record<string, () => Component> = {`,
    ...fieldComponentEntries
      .filter(([_, { filter }]) => filter)
      .map(
        ([name, { filter }]) => `  '${name}': () => defineAsyncComponent(() => import('${filter!.file.absolute}')),`,
      ),
    `}`,
    ``,
    `/**`,
    ` * Key-value object mapping block names to their corresponding Vue components.`,
    ` *`,
    ` * Components are loaded asynchronously using Vue's \`defineAsyncComponent\` function.`,
    ` * They are automatically registered by creating \`.vue\` files in the \`app/blocks/\` directory of the project.`,
    ` *`,
    ` * @example`,
    ` * \`\`\`vue`,
    ` * <template>`,
    ` *   <component v-if="blockComponents[blockName]" :is="blockComponents[blockName]" v-model="props" />`,
    ` * </template>`,
    ` * \`\`\``,
    ` */`,
    `export const blockComponents: Record<keyof Blocks, () => Component> = {`,
    ...blockEntries.map(
      ([name, { file }]) => `  '${name}': () => defineAsyncComponent(() => import('${file.absolute}')),`,
    ),
    `}`,
    ``,
    `const _validatorFn: any = () => null`,
    ...simpleValidatorsMeta.flatMap(({ name, comment, exampleField }) => [
      ``,
      `import type { ${name}Validator as _${name}Validator } from '@pruvious/orm'`,
      ``,
      `/**`,
      ...comment.map((line) => ` * ${line}`),
      ` *`,
      ` * This validator should only be used within the \`validators\` array when defining block fields.`,
      ` * The imported function is a meta function that does not execute any actual validation logic.`,
      ` * The real validation is performed on the server side and \`${name}Validator\` is removed from the Vue component during compilation.`,
      ` *`,
      ` * @example`,
      ` * \`\`\`vue`,
      ` * <script lang="ts" setup>`,
      ` * import { ${exampleField}, ${name}Validator } from '#pruvious/client'`,
      ` *`,
      ` * defineProps({`,
      ` *   foo: ${exampleField}({`,
      ` *     validators: [${name}Validator()],`,
      ` *   }),`,
      ` * })`,
      ` * </script>`,
      ` * \`\`\``,
      ` */`,
      `export const ${name}Validator: typeof _${name}Validator = _validatorFn`,
    ]),
    ``,
    `import type { uniqueValidator as _uniqueValidator } from '@pruvious/orm'`,
    ``,
    `/**`,
    ...validatorsMeta.find(({ name }) => name === 'unique')!.comment.map((line) => ` * ${line}`),
    ` *`,
    ` * This validator should only be used within the \`validators\` array when defining **repeater** fields in blocks.`,
    ` * The imported function is a meta function that does not execute any actual validation logic.`,
    ` * The real validation is performed on the server side and \`uniqueValidator\` is removed from the Vue component during compilation.`,
    ` *`,
    ` * @example`,
    ` * \`\`\`ts`,
    ` * <script lang="ts" setup>`,
    ` * import { repeaterField, textField, uniqueValidator } from '#pruvious/client'`,
    ` *`,
    ` * defineProps({`,
    ` *   variants: repeaterField({`,
    ` *     subfields: {`,
    ` *       name: textField({`,
    ` *         required: true,`,
    ` *         validators: [uniqueValidator()],`,
    ` *       }),`,
    ` *     },`,
    ` *   }),`,
    ` * })`,
    ` * </script>`,
    ` * \`\`\``,
    ` */`,
    `export const uniqueValidator: typeof _uniqueValidator = _validatorFn`,
    ``,
    getReExports(),
  ].join('\n')
}

/**
 * Generates the `#pruvious/client` type file content.
 */
function getClientTypeFileContent() {
  const nuxt = useNuxt()
  const pruviousOptions = nuxt.options.runtimeConfig.pruvious

  debug(`Generating <${relative(nuxt.options.workspaceDir, pruviousOptions.dir.build)}/client/index.d.ts>`)

  const fieldDefinitionFiles = resolveFieldDefinitionFiles()
  const fieldDefinitionEntries = Object.entries(fieldDefinitionFiles)

  return [
    ...fieldDefinitionEntries.map(([name]) => `export function ${name}Field(): any`),
    `export const tokenStorage: any`,
    `export const fieldComponents: any`,
    `export const tableFieldComponents: any`,
    `export const filterFieldComponents: any`,
    `export const blockComponents: any`,
    ...validatorsMeta.map(({ name }) => `export function ${name}Validator(): any`),
    `export function uniqueValidator(): any`,
    getReExports(),
  ].join('\n')
}

/**
 * Generates the `#pruvious/client/dayjs.ts` file content.
 */
function getClientDayjsFileContent() {
  const { resolve } = createResolver(import.meta.url)

  return [
    `export { dayjsLocales, dayjs, dayjsUTC, dayjsConfig, dayjsFormatDateTime, dayjsFormatDate, dayjsFormatTime, dayjsRelative, dayjsResolveTimezone } from '${resolve('../../../utils/pruvious/dashboard/dayjs')}'`,
  ].join('\n')
}

function getReExports() {
  const { resolve } = createResolver(import.meta.url)

  return [
    `export { dashboardBasePath } from './base'`,
    `export { i18n, _, __, languages, primaryLanguage, dashboardLanguages, isValidLanguageCode } from './i18n'`,
    `export { type Actions, type Filters, actions, filters, loadActions, loadFilters } from './hooks'`,
    `export { pruviousPost, pruviousGet, pruviousPatch, pruviousDelete, pruviousFetchHeaders, pfetch, type PruviousPostRoute, type PruviousPostOptions, type PruviousPostResponse, type PruviousGetRoute, type PruviousGetOptions, type PruviousGetResponse, type PruviousPatchRoute, type PruviousPatchOptions, type PruviousPatchResponse, type PruviousDeleteRoute, type PruviousDeleteOptions, type PruviousDeleteResponse, type PruviousFetchResponse, type PruviousFetchError } from '${resolve('../api/utils.client')}'`,
    `export { useAuth, refreshAuthState, getAuthTokenPayload, getAuthTokenExpiresIn, storeAuthToken, removeAuthToken, isLoggedIn, getUser, hasPermission, type AuthState } from '${resolve('../auth/utils.client')}'`,
    `export { usePruvious, usePruviousDashboard, refreshPruviousState, refreshPruviousDashboardState, deserializeTranslatableStringCallbacks } from '${resolve('../pruvious/utils.client')}'`,
    `export { useLanguage, extractLanguageCode, preloadTranslatableStrings, preloadTranslatableStringsForPath } from '${resolve('../translations/utils.client')}'`,
    `export { useDashboardContentLanguage } from '${resolve('../translations/dashboard-utils.client')}'`,
    `export { pruviousDashboardPost, pruviousDashboardGet, pruviousDashboardPatch, pruviousDashboardDelete, pfetchDashboard } from '${resolve('../api/dashboard-utils.client')}'`,
    `export { defineAction, defineFilter } from '${resolve('../hooks/define.client')}'`,
    `export { addAction, doActions, addFilter, applyFilters } from '${resolve('../hooks/utils.client')}'`,
    `export { QueryBuilder } from '${resolve('../client-query-builder/QueryBuilder')}'`,
    `export { insertInto, selectFrom, update, deleteFrom, selectSingleton, updateSingleton, useSelectQueryBuilderParams } from '${resolve('../client-query-builder/utils.client')}'`,
    `export { SingletonSelectQueryBuilder } from '${resolve('../client-query-builder/SingletonSelectQueryBuilder')}'`,
    `export { SingletonUpdateQueryBuilder } from '${resolve('../client-query-builder/SingletonUpdateQueryBuilder')}'`,
    `export { dashboardDefaultMiddleware } from '${resolve('../middleware/pruvious-dashboard')}'`,
    `export { dashboardAuthGuard } from '${resolve('../middleware/pruvious-dashboard-auth-guard')}'`,
    `export { dashboardGuestGuard } from '${resolve('../middleware/pruvious-dashboard-guest-guard')}'`,
    `export { type DashboardMiddleware, type DashboardMiddlewareContext, dashboardMiddleware } from '${resolve('../middleware/utils.client')}'`,
    `export { fillFieldData, prepareFieldData, getTopLevelFieldDependencies, parseConditionalLogic } from '${resolve('../fields/utils.client')}'`,
    `export { type DashboardMenuItem, usePruviousDashboardMenuExpanded, prepareDashboardMenu } from '${resolve('../../../utils/pruvious/dashboard/menu')}'`,
    `export { type HistoryOptions, unsavedChanges, History } from '${resolve('../../../utils/pruvious/dashboard/history')}'`,
    `export { usePruviousDashboardLayout, getOverlayTransitionDuration } from '${resolve('../../../utils/pruvious/dashboard/layout')}'`,
    `export { usePruviousLoginPopup } from '${resolve('../../../utils/pruvious/dashboard/login')}'`,
    `export { getCollectionBySlug, getSingletonBySlug } from '${resolve('../../../utils/pruvious/dashboard/slugs')}'`,
    `export { type ResolvedCollectionRecordPermissions, type ResolvedTranslatableCollectionRecordPermissions, type CollectionRecordPermissionsResolver, resolveCollectionRecordPermissions, resolveTranslatableCollectionRecordPermissions, useCollectionRecordPermissions } from '${resolve('../../../utils/pruvious/dashboard/permissions')}'`,
    `export { type WhereField, type FilterOperator, filterOperatorsMap, resolveFieldLabel, resolveFieldDescription, getValidFilterOperators } from '${resolve('../../../utils/pruvious/dashboard/fields')}'`,
    `export { usePruviousHMR } from '${resolve('../../../utils/pruvious/dashboard/hmr')}'`,
    `export { maybeTranslate } from '${resolve('../../../utils/pruvious/dashboard/i18n')}'`,
    `export { defineBlock } from '${resolve('../blocks/define.client')}'`,
    `export { customComponents } from './custom-components'`,
  ].join('\n')
}
