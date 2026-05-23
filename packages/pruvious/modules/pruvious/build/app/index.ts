import { validatorsMeta } from '@pruvious/orm'
import { createResolver, useNuxt } from 'nuxt/kit'
import { resolveFieldDefinitionFiles } from '../../fields/resolver'
import { resolvePruviousFile } from '../utils'

/**
 * Generates the `#pruvious/app` file content.
 */
export function getAppFileContent() {
  return [getReExports()].join('\n')
}

/**
 * Generates the `#pruvious/app` type file content.
 */
export function getAppTypeFileContent() {
  return [getReExports()].join('\n')
}

function getReExports() {
  const { resolve } = createResolver(import.meta.url)
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
    `export { blockDataInjection, blockNameInjection, blockPathInjection, proseListItemBlockPathInjection } from '${resolvePruviousFile('blocks/utils.client')}'`,

    // Dashboard
    `export { dashboardBasePath } from '../dashboard/base'`,

    // Fields
    ...fieldDefinitionEntries.map(([name]) => `export { ${name}Field } from './fields'`),

    // Field types
    `export { commonMarks, type CommonMark } from '${resolve('../../../../shared/pruvious/rich-text')}'`,

    // Hooks
    `export { type Actions, type Filters, actions, filters, loadActions, loadFilters } from './hooks'`,
    `export { defineAction, defineFilter } from '${resolvePruviousFile('hooks/define.client')}'`,
    `export { addAction, doActions, addFilter, applyFilters } from '${resolvePruviousFile('hooks/utils.client')}'`,

    // I18n
    `export { i18n, _, __, languages, primaryLanguage, isValidLanguageCode } from './i18n'`,

    // Routes
    `export { usePruviousRoute, resolvePruviousRoute, isPreview, type ResolvePruviousRouteOptions, type SimpleRedirect } from '${resolvePruviousFile('routes/composable')}'`,
    `export { resolvePath } from '${resolvePruviousFile('routes/utils.shared')}'`,

    // Translations
    `export { useLanguage, extractLanguageCode, preloadTranslatableStrings, preloadTranslatableStringsForPath } from '${resolvePruviousFile('translations/utils.client')}'`,

    // Validators
    ...validatorsMeta.map(({ name }) => `export { ${name}Validator } from './validators'`),
  ].join('\n')
}
