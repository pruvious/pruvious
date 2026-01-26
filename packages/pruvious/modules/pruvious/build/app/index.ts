import { validatorsMeta } from '@pruvious/orm'
import { useNuxt } from 'nuxt/kit'
import { relative } from 'pathe'
import { debug } from '../../debug/console'
import { resolveFieldDefinitionFiles } from '../../fields/resolver'
import { resolvePruviousFile } from '../utils'

/**
 * Generates the `#pruvious/app` file content.
 */
export function getAppFileContent() {
  const nuxt = useNuxt()
  const pruviousOptions = nuxt.options.runtimeConfig.pruvious

  debug(`Generating <${relative(nuxt.options.workspaceDir, pruviousOptions.dir.build)}/app/index.ts>`)

  return [getReExports()].join('\n')
}

/**
 * Generates the `#pruvious/app` type file content.
 */
export function getAppTypeFileContent() {
  const nuxt = useNuxt()
  const pruviousOptions = nuxt.options.runtimeConfig.pruvious

  debug(`Generating <${relative(nuxt.options.workspaceDir, pruviousOptions.dir.build)}/app/index.d.ts>`)

  return [getReExports()].join('\n')
}

function getReExports() {
  const nuxt = useNuxt()
  const fieldDefinitionFiles = resolveFieldDefinitionFiles()
  const fieldDefinitionEntries = Object.entries(fieldDefinitionFiles)

  return [
    ...(nuxt.options.runtimeConfig._tsCheckPruvious ? [] : [`// @ts-nocheck`]),

    // API
    `export { type PruviousPostRoute, type PruviousPostOptions, type PruviousPostResponse, type PruviousGetRoute, type PruviousGetOptions, type PruviousGetResponse, type PruviousPatchRoute, type PruviousPatchOptions, type PruviousPatchResponse, type PruviousDeleteRoute, type PruviousDeleteOptions, type PruviousDeleteResponse, type PruviousFetchResponse, type PruviousFetchError, pruviousPost, pruviousGet, pruviousPatch, pruviousDelete, pruviousFetchHeaders, $pfetch, pruviousFetch } from '${resolvePruviousFile('api/utils.client')}'`,

    // Auth
    `export { type AuthState, useAuth, refreshAuthState, getAuthTokenPayload, getAuthTokenExpiresIn, storeAuthToken, removeAuthToken, isLoggedIn, getUser, hasPermission } from '${resolvePruviousFile('auth/utils.client')}'`,

    // Blocks
    `export { blockComponents } from './blocks'`,
    `export { defineBlock } from '${resolvePruviousFile('blocks/define.client')}'`,

    // Dashboard
    `export { dashboardBasePath } from '../dashboard/base'`,

    // Fields
    ...fieldDefinitionEntries.map(([name]) => `export { ${name}Field } from './fields'`),

    // Hooks
    `export { type Actions, type Filters, actions, filters, loadActions, loadFilters } from './hooks'`,
    `export { defineAction, defineFilter } from '${resolvePruviousFile('hooks/define.client')}'`,
    `export { addAction, doActions, addFilter, applyFilters } from '${resolvePruviousFile('hooks/utils.client')}'`,

    // I18n
    `export { i18n, _, __, languages, primaryLanguage, isValidLanguageCode } from './i18n'`,

    // Routes
    `export { usePruviousRoute, resolvePruviousRoute, isPreview } from '${resolvePruviousFile('routes/composable')}'`,
    `export { resolvePath } from '${resolvePruviousFile('routes/utils.shared')}'`,

    // Translations
    `export { useLanguage, extractLanguageCode, preloadTranslatableStrings, preloadTranslatableStringsForPath } from '${resolvePruviousFile('translations/utils.client')}'`,

    // Validators
    ...validatorsMeta.map(({ name }) => `export { ${name}Validator } from './validators'`),
  ].join('\n')
}
