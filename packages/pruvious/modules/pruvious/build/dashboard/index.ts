import { remap } from '@pruvious/utils'
import { useNuxt } from 'nuxt/kit'
import { relative } from 'pathe'
import { resolveDashboardPageFiles } from '../../dashboard-pages/resolver'
import { debug } from '../../debug/console'
import { resolveFieldComponentFiles } from '../../fields/resolver'
import { stringifyImageTransformOptions } from '../../uploads/images'
import { resolvePruviousFile, resolvePruviousUtilsFile } from '../utils'

/**
 * Generates the `#pruvious/dashboard` file content.
 */
export function getDashboardFileContent() {
  const nuxt = useNuxt()
  const pruviousOptions = nuxt.options.runtimeConfig.pruvious

  debug(`Generating <${relative(nuxt.options.workspaceDir, pruviousOptions.dir.build)}/dashboard/index.ts>`)

  const fieldComponentFiles = resolveFieldComponentFiles()
  const fieldComponentEntries = Object.entries(fieldComponentFiles)

  resolveDashboardPageFiles()

  return [
    `import { type Component, defineAsyncComponent } from 'vue'`,
    `import type { ImageVariant } from '../server'`,
    `import type { ImageVariantOptions } from '${resolvePruviousFile('uploads/images')}'`,
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
    ` * Controls which stylesheets are retained in the dashboard by filtering based on selector content.`,
    ` * Any stylesheet without rules containing these strings will be automatically disabled.`,
    ` */`,
    `export const filterStylesheets = ${JSON.stringify(nuxt.options.runtimeConfig.pruvious.dashboard.filterStylesheets)}`,
    ``,
    `/**`,
    ` * Key-value object defining image variants for uploaded images in the CMS.`,
    ` */`,
    `export const imageVariants: Record<ImageVariant, Required<ImageVariantOptions> & { suffix: string }> = ${JSON.stringify(remap(nuxt.options.runtimeConfig.pruvious.images.variants, (key, options) => [key, { ...options, suffix: stringifyImageTransformOptions({ ...options, originalExtension: '' }) }]))}`,
    ``,
    getReExports(),
  ].join('\n')
}

/**
 * Generates the `#pruvious/dashboard` type file content.
 */
export function getDashboardTypeFileContent() {
  const nuxt = useNuxt()
  const pruviousOptions = nuxt.options.runtimeConfig.pruvious

  debug(`Generating <${relative(nuxt.options.workspaceDir, pruviousOptions.dir.build)}/dashboard/index.d.ts>`)

  return [
    `export const fieldComponents: any`,
    `export const tableFieldComponents: any`,
    `export const filterFieldComponents: any`,
    `export const filterStylesheets: any`,
    `export const imageVariants: any`,
    getReExports(),
  ].join('\n')
}

function getReExports() {
  return [
    // API
    `export { pruviousDashboardPost, pruviousDashboardGet, pruviousDashboardPatch, pruviousDashboardDelete, $pfetchDashboard, pruviousDashboardFetch } from '${resolvePruviousFile('api/dashboard-utils.client')}'`,

    // Custom components
    `export { customComponents } from './custom-components'`,

    // Dashboard pages
    `export { type DefineDashboardPageOptions, defineDashboardPage } from '${resolvePruviousFile('dashboard-pages/define')}'`,

    // Fields
    `export { fillFieldData, prepareFieldData, getTopLevelFieldDependencies, parseConditionalLogic, parseFields } from '${resolvePruviousFile('fields/utils.client')}'`,

    // I18n
    `export { dashboardLanguages } from './i18n'`,

    // Middleware
    `export { dashboardDefaultMiddleware } from '${resolvePruviousFile('middleware/pruvious-dashboard')}'`,
    `export { dashboardAuthGuard } from '${resolvePruviousFile('middleware/pruvious-dashboard-auth-guard')}'`,
    `export { dashboardGuestGuard } from '${resolvePruviousFile('middleware/pruvious-dashboard-guest-guard')}'`,
    `export { type DashboardMiddleware, type DashboardMiddlewareContext, dashboardMiddleware } from '${resolvePruviousFile('middleware/utils.client')}'`,

    // Preview
    `export { usePreviewKey } from '${resolvePruviousFile('preview/composable')}'`,
    `export { usePreviewParsedFields, usePreviewHighlightedBlocks, usePreviewFocusedBlocks, usePreviewFields, usePreviewBlocks, usePreviewBlockLabels, usePreviewRouteReferences, usePreviewIsEditable, usePreviewFocusNext, usePreviewDashboardLanguage, initializePreview } from '${resolvePruviousFile('preview/utils.client')}'`,

    // Pruvious
    `export { usePruvious, usePruviousDashboard, refreshPruviousState, refreshPruviousDashboardState, deserializeTranslatableStringCallbacks } from '${resolvePruviousFile('pruvious/utils.client')}'`,

    // Query builder
    `export { QueryBuilder } from '${resolvePruviousFile('client-query-builder/QueryBuilder')}'`,
    `export { SingletonSelectQueryBuilder } from '${resolvePruviousFile('client-query-builder/SingletonSelectQueryBuilder')}'`,
    `export { SingletonUpdateQueryBuilder } from '${resolvePruviousFile('client-query-builder/SingletonUpdateQueryBuilder')}'`,
    `export { insertInto, selectFrom, batchSelectIn, update, deleteFrom, selectSingleton, updateSingleton, useSelectQueryBuilderParams } from '${resolvePruviousFile('client-query-builder/utils.client')}'`,

    // Routes
    `export { getRouteReferences } from '${resolvePruviousFile('routes/utils.client')}'`,

    // Translations
    `export { useDashboardContentLanguage } from '${resolvePruviousFile('translations/dashboard-utils.client')}'`,
    `export { serializeTranslatableStringCallbacks } from '${resolvePruviousFile('translations/utils.shared')}'`,

    // Uploads
    `export { type PruviousFile, type UseUploadResult, useUploadSpeed, upload, useUpload, createUploadDirectory, moveUpload, updateUpload, deleteUpload, uploadExists, splitFileIntoChunks, resolveUploadPath, resolveThumbnailPath } from '${resolvePruviousFile('uploads/utils.client')}'`,
    `export { type OptimizableImageType, mediaCategories, displayableImageTypes, optimizableImageTypes, playableVideoTypes } from '${resolvePruviousFile('uploads/utils.shared')}'`,

    // Various dashboard utils
    `export { dashboardBasePath } from './base'`,
    `export { type PruviousClipboardData, usePruviousClipboardData, usePruviousClipboard } from '${resolvePruviousUtilsFile('dashboard/clipboard')}'`,
    `export { type WhereField, type FilterOperator, filterOperatorsMap, resolveFieldLabel, resolveFieldDescription, getValidFilterOperators } from '${resolvePruviousUtilsFile('dashboard/fields')}'`,
    `export { type HistoryOptions, unsavedChanges, History } from '${resolvePruviousUtilsFile('dashboard/history')}'`,
    `export { usePruviousHMR } from '${resolvePruviousUtilsFile('dashboard/hmr')}'`,
    `export { maybeTranslate } from '${resolvePruviousUtilsFile('dashboard/i18n')}'`,
    `export { useDashboardLayout, getOverlayTransitionDuration } from '${resolvePruviousUtilsFile('dashboard/layout')}'`,
    `export { type UploadItem, type DashboardMediaLibraryState, type DashboardMediaLibraryPopupState, usePruviousDashboardMediaLibraryPopup, getDefaultDashboardMediaLibraryState } from '${resolvePruviousUtilsFile('dashboard/media-library')}'`,
    `export { useDragImageLabel, useIsMoving, startMoving, stopMoving } from '${resolvePruviousUtilsFile('dashboard/move')}'`,
    `export { useLoginPopup } from '${resolvePruviousUtilsFile('dashboard/login')}'`,
    `export { type DashboardMenuItem, useDashboardMenuExpanded, prepareDashboardMenu } from '${resolvePruviousUtilsFile('dashboard/menu')}'`,
    `export { type ResolvedCollectionRecordPermissions, type ResolvedTranslatableCollectionRecordPermissions, type CollectionRecordPermissionsResolver, resolveCollectionRecordPermissions, resolveTranslatableCollectionRecordPermissions, useCollectionRecordPermissions } from '${resolvePruviousUtilsFile('dashboard/permissions')}'`,
    `export { getCollectionBySlug, getSingletonBySlug } from '${resolvePruviousUtilsFile('dashboard/slugs')}'`,
    `export { type DashboardUploadNotification, type DashboardUploadNotificationWidget, usePruviousDashboardUploadNotifications, usePruviousDashboardUploadNotificationsWidget } from '${resolvePruviousUtilsFile('dashboard/upload-notifications')}'`,
  ].join('\n')
}
