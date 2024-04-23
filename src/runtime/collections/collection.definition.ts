import type {
  AuthUser,
  BlockName,
  CollectionField,
  CollectionName,
  PrimaryLanguage,
  PruviousIcon,
  SupportedLanguage,
} from '#pruvious'
import { languageLabels, primaryLanguage, supportedLanguages } from '#pruvious/preflight'
import { nanoid } from 'nanoid'
import pluralize from 'pluralize-esm'
import type { FieldContext, ResolvedFieldDefinition, TranslationHelpersContext } from '../fields/field.definition'
import type { QueryBuilderInstance } from '../utility-types'
import { isDefined } from '../utils/common'
import { isKeyOf, isObject, objectOmit } from '../utils/object'
import { isString, joinRouteParts, titleCase } from '../utils/string'
import { uniqueValidator } from '../validators/unique'
import { query } from './query'

interface BaseCollectionDefinition {
  /**
   * A unique collection name.
   *
   * The name can contain only lowercase alphanumeric characters and hyphens.
   * It must begin with a letter, end with an alphanumeric character, and it cannot have two consecutive hyphens.
   *
   * Examples: 'products', 'news', 'form-entries', etc.
   */
  name: string

  /**
   * Defines the mode of the collection entries.
   *
   * - `multi` - Collection operates with multiple records (suitable for pages, users, products, etc.)
   * - `single` - Collection operates with just one record (suitable for option pages, global variables, etc.)
   */
  mode: 'multi' | 'single'

  /**
   * Fields used in the collection.
   *
   * Field names should follow camel-case formatting and must not exceed 60 characters in length.
   *
   * Note: The field names `id`, `language`, and `translations` are reserved and cannot be declared.
   *
   * @example
   * ```typescript
   * defineCollection({
   *   name: 'products',
   *   mode: 'multi',
   *   fields: {
   *     name: { type: 'text', options: { ... }, additional: { ... } },
   *     price: { type: 'number', options: { ... }, additional: { ... } },
   *     image: { type: 'image', options: { ... } },
   *   },
   * })
   * ```
   */
  fields: Record<string, CollectionField>

  /**
   * Specifies whether the collection supports translations.
   *
   * Languages can be customized in the `language` module options.
   *
   * @default false
   */
  translatable?: boolean

  /**
   * Array of custom guards executed during collection record creation, reading, updating, or deletion via standard **API** routes
   * (`/api/collections/[collection-name]`).
   * Guards are executed in sequence according to their array order, with the exception that they are not applied to admin users.
   *
   * Collection guards execute before field guards.
   * Standard guards, like `collection-[collection-name]-[create|read|update|delete]`, are executed before custom guards.
   *
   * Note: Creation and deletion guards are not supported in single-entry collections.
   *
   * @default []
   *
   * @example
   * ```typescript
   * [
   *   ({ _, language, user }) => {
   *     if (!hasCapability(user, 'custom-capability')) {
   *       throw new Error(_(language, 'Access denied'))
   *     }
   *   },
   * ]
   * ```
   */
  guards?: CollectionGuard[]

  /**
   * Dashboard related settings for this collection.
   */
  dashboard?: {
    /**
     * Specifies whether the collection is visible in the dashboard.
     *
     * @default true
     */
    visible?: boolean

    /**
     * The icon used for this collection in the dashboard.
     *
     * Defaults to `'Pin'` for multi-entry collections and `'Settings'` for single-entry collections.
     */
    icon?: PruviousIcon

    /**
     * Specifies a field (property name in `fields`) to display as the title when creating or editing a record (e.g., 'title', 'path', etc.).
     * The type of the specified field should be a string or number.
     *
     * Note: This parameter is only applicable to multi-entry collections.
     */
    primaryField?: string

    /**
     * Defines the field layout in the dashboard.
     * The layout array accepts the following values:
     *
     * - **`string`** - The field name.
     * - **`string[]`** - An array of field names that will be displayed in a row.
     * - **`Record<string, FieldLayout[]>`** - A tabbed layout.
     * - **`'<./components/CustomComponent.vue>'`** - A Vue component path relative to the project root.
     * - **`# Heading`** - The tab label of a tabbed layout when content builder is enabled.
     *
     * If not specified, all displayable fields will be shown vertically one after another.
     *
     * Custom components can be used to display additional information about the collection.
     * They receive the following props:
     *
     * - **`record`** - The current record.
     * - **`history`** - A `History` instance for the current record.
     * - **`errors`** - A key-value object with field names (in dot-notation) as keys and error messages as values.
     * - **`disabled`** - A boolean indicating whether the user has permission to create or edit the record.
     * - **`compact`** - A boolean indicating whether the component is displayed in a compact mode.
     * - **`resolvedConditionalLogic`** - The resolved conditional logic for all fields.
     * - **`keyPrefix`** - A string used as a prefix for all field names.
     *
     * Additionally, the component can have the `update:record` and `update:errors` emits.
     *
     * @example
     * ```typescript
     * defineCollection({
     *   ...,
     *   dashboard: {
     *     fieldLayout: [
     *       'name',                   // Single field
     *       ['email', 'phone | 40%'], // Two fields in a row
     *       {
     *         'Tab 1': ['street', 'city', 'zip'],       // Three fields in a row
     *         'Tab 2': ['<./component/CustomMap.vue>'], // Vue component path relative to the project root
     *       },
     *     ],
     *     },
     * })
     * ```
     */
    fieldLayout?: FieldLayout[]

    /**
     * Table settings for the collection's overview page.
     *
     * Note: This setting is applicable only to multi-entry collections.
     *
     * If not specified, the overview table will be automatically generated based on the collection fields.
     */
    overviewTable?: {
      /**
       * The default collection fields to display in the overview table as columns.
       * You can provide either the field name or an object with the `field` and `width` properties.
       * The `width` property sets the column width in percent (%).
       * The first column is always a link (string) to the record details page.
       *
       * If not specified, the first 4-6 fields will be displayed, with the last two columns reserved for the `createdAt` and `updatedAt` fields, if available.
       */
      columns?: (string | { field: string; width?: number })[]

      /**
       * The default sorting field and direction for the overview table.
       *
       * If not specified, the `createdAt` or `updatedAt` field will be used, if available.
       * Otherwise, the first field will be used.
       *
       * The default direction is `desc`.
       */
      sort?: { field: string; direction: 'asc' | 'desc' }

      /**
       * The default number of records displayed per page.
       *
       * @default 50
       */
      perPage?: number

      /**
       * The field or fields used to display search results for this collection in the dashboard.
       *
       * If not specified, the first custom field or the record ID will be used as the search label.
       */
      searchLabel?: string | [string, string]

      /**
       * The relative path to a Vue component that shows additional options for the current record in the overview table.
       *
       * The Vue component should define the following props:
       *
       * - **`id`** - The record ID.
       * - **`table`** - The `CollectionOverview` instance.
       */
      additionalTableRowOptionsVueComponent?: string
    }

    /**
     * The relative path to a Vue component that shows additional options for the current record in the create or edit page.
     *
     * The Vue component should define the following props:
     *
     * - **`record`** - The record object.
     *
     * The component can have the `update:record` emit to update the record object.
     */
    additionalRecordOptionsVueComponent?: string
  }

  /**
   * The name of an automatically generated and read-only field that stores a timestamp indicating when a collection record was created.
   * Set to `false` to disable the creation timestamp field.
   * If enabled, avoid redeclaring this field in the `fields` property.
   *
   * @default 'createdAt'
   */
  createdAtField?: string | false

  /**
   * The name of an automatically generated and read-only field that stores a timestamp indicating when a collection record was last updated.
   * Set to `false` to disable the last update timestamp field.
   * If enabled, avoid redeclaring this field in the `fields` property.
   *
   * @default 'updatedAt'
   */
  updatedAtField?: string | false

  /**
   * Specifies whether to cache `SELECT` database queries for this collection if their execution time exceeds the specified value in milliseconds.
   * Set to `0` to cache all queries.
   * Set to `false` to disable caching.
   *
   * Note: To enable this feature, you must specify the `redis` parameter in the Pruvious module options.
   *
   * @default 10
   */
  cacheQueries?: number | false

  /**
   * Specifies whether to clear the query and page cache when a record is created, updated, or deleted.
   * Set to `false` to never clear the cache.
   *
   * By default, the cache is cleared on all operations.
   */
  clearCacheRules?:
    | {
        /**
         * Specifies whether to clear the cache when a record is created.
         *
         * Note: This parameter is only applicable to multi-entry collections.
         *
         * @default true
         */
        onCreate?: boolean

        /**
         * Specifies whether to clear the cache when a record is updated.
         *
         * @default true
         */
        onUpdate?: boolean

        /**
         * Specifies whether to clear the cache when a record is deleted.
         *
         * Note: This parameter is only applicable to multi-entry collections.
         *
         * @default true
         */
        onDelete?: boolean
      }
    | false

  /**
   * An array of fields that should not be cached due to their sensitive nature.
   *
   * @default []
   */
  nonCachedFields?: string[]
}

export interface SingleEntryCollectionDefinition extends BaseCollectionDefinition {
  mode: 'single'

  /**
   * Collection related labels shown in the dashboard.
   * You can provide either an object or a plural lowercase string of the collection name.
   *
   * If not specified, labels will be auto-generated from the collection `name`.
   */
  label?:
    | {
        /**
         * Plural, lowercase label of the collection (e.g., 'form entries').
         * You can provide an object to explicitly define the singular version.
         *
         * If not specified, the collection labels will be auto-generated from the collection `name` property.
         */
        collection?:
          | string
          | {
              /**
               * Lowercase singular collection label (e.g., 'form entry').
               */
              singular: string

              /**
               * Lowercase plural collection label (e.g., 'form entries').
               */
              plural: string
            }
      }
    | string

  /**
   * Determines the default API routes enabled for this collection.
   *
   * The default routes are as follows:
   *
   * - GET `/api/collections/[collection-name]?language=[code]`
   * - PATCH `/api/collections/[collection-name]?language=[code]`
   *
   * Set to `false` to disable all routes.
   */
  apiRoutes?:
    | {
        /**
         * Specifies whether to enable the default API route for reading a record in a collection.
         *
         * - When set to `'public'`, the route is accessible to all users.
         * - When set to `'private'`, the route requires the user to be authenticated.
         * - When set to `false`, the route is disabled.
         *
         * @default 'private'
         */
        read?: 'public' | 'private' | false

        /**
         * Specifies whether to enable the default API route for updating a collection record.
         *
         * - When set to `'public'`, the route is accessible to all users.
         * - When set to `'private'`, the route requires the user to be authenticated.
         * - When set to `false`, the route is disabled.
         *
         * @default 'private'
         */
        update?: 'public' | 'private' | false
      }
    | false
}

export interface MultiEntryCollectionDefinition extends BaseCollectionDefinition {
  mode: 'multi'

  /**
   * Collection related labels shown in the dashboard.
   * You can provide either an object or a plural lowercase string of the collection name.
   *
   * If not specified, labels will be auto-generated from the collection `name`.
   */
  label?:
    | {
        /**
         * Plural, lowercase label of the collection (e.g., 'form entries').
         * You can provide an object to explicitly define the singular version.
         *
         * If not specified, the collection labels will be auto-generated from the collection `name` property.
         */
        collection?:
          | string
          | {
              /**
               * Lowercase singular collection label (e.g., 'form entry').
               */
              singular: string

              /**
               * Lowercase plural collection label (e.g., 'form entries').
               */
              plural: string
            }

        /**
         * Plural, lowercase label of the collection record (e.g., 'entries').
         * You can provide an object to explicitly define the singular version.
         *
         * If not specified, the record labels will be auto-generated from the collection `name` property.
         *
         * Note: Record labels are applicable only to multi-entry collections.
         */
        record?:
          | string
          | {
              /**
               * Lowercase singular record label (e.g., 'entry').
               */
              singular: string

              /**
               * Lowercase plural record label (e.g., 'entries').
               */
              plural: string
            }
      }
    | string

  /**
   * Determines the default API routes enabled for this collection.
   *
   * The default routes are as follows:
   *
   * - POST `/api/collections/[collection-name]`
   * - GET `/api/collections/[collection-name]`
   * - GET `/api/collections/[collection-name]/[record-id]`
   * - PATCH `/api/collections/[collection-name]`
   * - PATCH `/api/collections/[collection-name]/[record-id]`
   * - DELETE `/api/collections/[collection-name]`
   * - DELETE `/api/collections/[collection-name]/[record-id]`
   *
   * Set to `false` to disable all routes.
   */
  apiRoutes?:
    | {
        /**
         * Specifies whether to enable the default API route for creating a record in a multi-entry collection.
         *
         * - When set to `'public'`, the route is accessible to all users.
         * - When set to `'private'`, the route requires the user to be authenticated.
         * - When set to `false`, the route is disabled.
         *
         * @default 'private'
         */
        create?: 'public' | 'private' | false

        /**
         * Specifies whether to enable the default API route for creating multiple records in a multi-entry collection.
         *
         * - When set to `'public'`, the route is accessible to all users.
         * - When set to `'private'`, the route requires the user to be authenticated.
         * - When set to `false`, the route is disabled.
         *
         * @default 'private'
         */
        createMany?: 'public' | 'private' | false

        /**
         * Specifies whether to enable the default API route for reading a record in a collection.
         *
         * - When set to `'public'`, the route is accessible to all users.
         * - When set to `'private'`, the route requires the user to be authenticated.
         * - When set to `false`, the route is disabled.
         *
         * @default 'private'
         */
        read?: 'public' | 'private' | false

        /**
         * Specifies whether to enable the default API route for reading multiple records in a collection.
         *
         * - When set to `'public'`, the route is accessible to all users.
         * - When set to `'private'`, the route requires the user to be authenticated.
         * - When set to `false`, the route is disabled.
         *
         * @default 'private'
         */
        readMany?: 'public' | 'private' | false

        /**
         * Specifies whether to enable the default API route for updating a collection record.
         *
         * - When set to `'public'`, the route is accessible to all users.
         * - When set to `'private'`, the route requires the user to be authenticated.
         * - When set to `false`, the route is disabled.
         *
         * @default 'private'
         */
        update?: 'public' | 'private' | false

        /**
         * Specifies whether to enable the default API route for updating multiple collection records.
         *
         * - When set to `'public'`, the route is accessible to all users.
         * - When set to `'private'`, the route requires the user to be authenticated.
         * - When set to `false`, the route is disabled.
         *
         * @default 'private'
         */
        updateMany?: 'public' | 'private' | false

        /**
         * Specifies whether to enable the default API route for deleting a record in a multi-entry collection.
         *
         * - When set to `'public'`, the route is accessible to all users.
         * - When set to `'private'`, the route requires the user to be authenticated.
         * - When set to `false`, the route is disabled.
         *
         * @default 'private'
         */
        delete?: 'public' | 'private' | false

        /**
         * Specifies whether to enable the default API route for deleting multiple records in a multi-entry collection.
         *
         * - When set to `'public'`, the route is accessible to all users.
         * - When set to `'private'`, the route requires the user to be authenticated.
         * - When set to `false`, the route is disabled.
         *
         * @default 'private'
         */
        deleteMany?: 'public' | 'private' | false
      }
    | false

  /**
   * Determines whether the collection records are page-like and publicly accessible via the `pages.get` API endpoint.
   *
   * @default false
   *
   * @example
   * ```typescript
   * defineCollection({
   *   name: 'docs',
   *   mode: 'multi',
   *   publicPages: { pathPrefix: 'docs' },
   *   ...,
   * })
   * ```
   */
  publicPages?: PublicPagesOptions | false

  /**
   * Specifies if the block builder is enabled for this collection.
   *
   * @default false
   */
  contentBuilder?: ContentBuilder | false

  /**
   * Specifies searchable fields and their order for search queries.
   * Multiple search structures can be specified using object keys.
   * The `default` key must always be present.
   * Field values are parsed and stored in an internal column for keywords based on their order of appearance.
   *
   * The search algorithm arranges results based on the order of keyword occurrences.
   * This implies that keywords with lower indices will be prioritized in sorting over those with higher indices.
   *
   * By default the search functionality is disabled.
   *
   * @default false
   *
   * @example
   * ```typescript
   * defineCollection({ name: 'products', search: { default: [{ field: 'name', reserve: 30 }, 'description'] }, ... })
   *
   * // Example 1
   * // The record { id: 1, name: 'Product name', description: 'xy...' } will have the following keywords structure:
   * // 'Product name                   xy...'
   *
   * // Example 2
   * // The record { id: 2, name: 'Product with long name', description: 'yx...' } will look like this:
   * // 'Product with long name         yx...'
   *
   * // Search example 1
   * await query('products').select({ id: true }).search('NaMe')
   * // Output: [{ id: 1}, { id: 2 }]
   * // The keyword 'NaMe' is found earlier in the record with ID 1
   *
   * // Search example 2
   * await query('products').select({ id: true }).search('y')
   * // Output: [{ id: 2}, { id: 1 }]
   * // The keyword 'y' is found earlier in the record with ID 2
   *
   * // Search example 3
   * await query('products').select({ id: true }).search('1')
   * // Output: []
   * // The field 'id' (1) is not included in the search structure
   * ```
   */
  search?: (Record<'default', (CollectionSearch | string)[]> & Record<string, (CollectionSearch | string)[]>) | false

  /**
   * An array of composite indexes represented as arrays of collection field names.
   *
   * @default []
   *
   * @example
   * ```typescript
   * [['title', 'language']] // Creates one composite index with the fields `title` and `language`
   * ```
   */
  compositeIndexes?: [string, string, ...string[]][]

  /**
   * An array of unique composite indexes represented as arrays of collection field names.
   *
   * @default []
   *
   * @example
   * ```typescript
   * [['directory', 'filename']] // Creates one unique composite index with the fields `directory` and `filename`
   * ```
   */
  uniqueCompositeIndexes?: [string, string, ...string[]][]

  /**
   * The function used for duplicating records.
   * It accepts a `context` argument, which includes the following:
   *
   * - `record` - The original record to duplicate.
   * - `query` - Utility function for creating a new query builder.
   *
   * When specified, the API route for duplicating records (POST `/api/collections/[collection-name]/[id]/duplicate`) will be enabled.
   * Additionally, the collection overview table will display the 'Duplicate' button.
   *
   * @default false
   *
   * @example
   * ```typescript
   * (record) => ({ ...record, public: false })
   * ```
   */
  duplicate?: ((context: DuplicateContext) => Record<string, any> | Promise<Record<string, any>>) | false

  /**
   * The function used for mirroring record translations (POST `/api/collections/[collection-name]/[id]/mirror`).
   * It accepts a `context` argument, which includes the following:
   *
   * - `from` - The original record to create a translation from.
   * - `to` - The translated record to create or update.
   * - `language` - The language code of the `to` translation.
   * - `query` - Utility function for creating a new query builder.
   *
   * @default ({ from, to, language }) => ({ ...from, id: to?.id, language })
   */
  mirrorTranslation?: (context: MirrorTranslationContext) => Record<string, any> | Promise<Record<string, any>>
}

export type CollectionDefinition = SingleEntryCollectionDefinition | MultiEntryCollectionDefinition

export interface PublicPagesOptions {
  /**
   * The URL path prefix for the collection records (e.g., 'docs').
   * The prefix can be specified for each supported language separately using an object with language codes as keys.
   *
   * @default ''
   */
  pathPrefix?: string | (Record<PrimaryLanguage, string> & Partial<Record<SupportedLanguage, string>>)

  /**
   * The name of the field (property name in `fields`) used to store the URL path that will be appended to the `pathPrefix`.
   *
   * @default 'path'
   */
  pathField?: string

  /**
   * The name of the field (property name in `fields`) used to store the public state of the record.
   * When specified, the `draftTokenField` parameter must also be specified.
   *
   * @default false
   */
  publicField?: string | false

  /**
   * The name of the field (property name in `fields`) used to store the draft token.
   *
   * @default false
   */
  draftTokenField?: string | false

  /**
   * The name of the field (property name in `fields`) used to store the publish date.
   *
   * Note: When specified, the `publicField` parameter must also be specified.
   *
   * @default false
   */
  publishDateField?: string | false

  /**
   * The name of the field (property name in `fields`) to use as the page layout.
   *
   * @default false
   */
  layoutField?: string | false

  /**
   * An array of additional fields to include in the public page response (e.g. `['createdAt', 'author', ...]`).
   * These fields will be included in the `fields` property of the response for the `pages.get` and `previews.get` API endpoints.
   *
   * @default []
   */
  additionalFields?: string[]

  /**
   * SEO related fields.
   */
  seo?: {
    /**
     * The name of the field (property name in `fields`) used to store the page title.
     *
     * @default false
     */
    titleField?: string | false

    /**
     * The name of the field (property name in `fields`) used to store the base title boolean.
     * This value defines whether the base title defined in the SEO settings should be displayed together with the page title.
     *
     * @default false
     */
    baseTitleField?: string | false

    /**
     * The name of the field (property name in `fields`) used to store the page description.
     *
     * @default false
     */
    descriptionField?: string | false

    /**
     * The name of the field (property name in `fields`) used to the search engine visibility boolean.
     *
     * @default false
     */
    visibleField?: string | false

    /**
     * The name of the field (property name in `fields`) used to store sharing image.
     *
     * @default false
     */
    sharingImageField?: string | false

    /**
     * The name of the field (property name in `fields`) used to store the meta tags array.
     *
     * @default false
     */
    metaTagsField?: string | false
  }
}

export interface ContentBuilder {
  /**
   * The name of the field (property name in `fields`) used to store blocks.
   * This field must exist in the collection and be of type `blocks`.
   */
  blocksField: string

  /**
   * An array of block names allowed to be used in the block builder.
   *
   * By default, all blocks are permitted.
   *
   * @default '*'
   */
  allowedBlocks?: BlockName[] | '*'

  /**
   * An array of block names allowed as top-level blocks in the block builder.
   *
   * Note: Root blocks must also be included in the `allowedBlocks` array.
   *
   * By default, all blocks are permitted as top-level blocks.
   *
   * @default '*'
   */
  rootBlocks?: BlockName[] | '*'
}

export interface CollectionGuardContext extends TranslationHelpersContext {
  /**
   * The current logged-in user associated with the request or `null` if no user is authenticated.
   */
  user: AuthUser | null

  /**
   * The resolved field definition object.
   */
  definition: ResolvedCollectionDefinition

  /**
   * An array of input values used for creating multiple records.
   * Input values are regular key-value objects, where the key represents the field name, and the value represents the field's value.
   */
  allInputs?: Record<string, any>[]

  /**
   * The input values used for creating a single record or updating records.
   * It is a regular key-value object, where the key represents the field name, and the value represents the field's value.
   */
  input?: Record<string, any>

  /**
   * Preferred user language for displaying validation errors.
   */
  language: SupportedLanguage

  /**
   * The current query operation.
   */
  operation: 'create' | 'read' | 'update' | 'delete'

  /**
   * The current query builder instance.
   * Utilize `query.clone()` to execute custom queries, such as data retrieval.
   */
  currentQuery: QueryBuilderInstance<CollectionName>

  /**
   * Utility function for creating a new query builder.
   */
  query: typeof query

  /**
   * A cache object for storing data made during executing all guards.
   * This object persists throughout the session, encompassing all collection and field guards, and can be utilized for purposes like query storage.
   */
  cache: Record<string, any>
}

export interface ExtractKeywordsContext extends Omit<FieldContext, 'name'> {
  /**
   * The field value.
   */
  value: any

  /**
   * The current record containing all fields with the specified `fieldValueType`.
   */
  record: Record<string, any>

  /**
   * An object representing field definitions using key-value pairs.
   */
  fields: Record<string, ResolvedFieldDefinition>

  /**
   * Indicates whether the context uses casted or populated field values.
   */
  fieldValueType: 'casted' | 'populated'

  /**
   * The resolved definition of the currently queried collection.
   */
  collection: ResolvedCollectionDefinition

  /**
   * Resolved definitions of all registered collections.
   */
  collections: Record<CollectionName, ResolvedCollectionDefinition>
}

export type CollectionGuard =
  | ((context: CollectionGuardContext) => any | Promise<any>)
  | {
      /**
       * Determines whether to call this guard before creating records.
       *
       * Note: This parameter is only applicable to multi-entry collections.
       *
       * @default false
       */
      onCreate?: boolean

      /**
       * Determines whether to call this guard before reading records.
       *
       * @default false
       */
      onRead?: boolean

      /**
       * Determines whether to call this guard before updating records.
       *
       * @default false
       */
      onUpdate?: boolean

      /**
       * Determines whether to call this guard before deleting records.
       *
       * Note: This parameter is only applicable to multi-entry collections.
       *
       * @default false
       */
      onDelete?: boolean

      /**
       * The guard function.
       *
       * It accepts a `context` argument, which includes the following:
       *
       * - `_` - A helper function used to display validation errors in the default domain and a specific language.
       * - `__` - A helper function used to display validation errors in a specific domain and language.
       * - `allInputs` - An array of input values used for creating or updating multiple record.
       * - `cache` - A shared key-record object for caching queries across all guards.
       * - `currentQuery` - The current query builder instance.
       * - `definition` - The resolved collection definition object.
       * - `input` - The input values used for creating or updating a record.
       * - `language` - Preferred user language for displaying validation errors.
       * - `operation` - The current query operation.
       * - `query` - Utility function for creating a new query builder.
       * - `user` - The currently logged-in user or `null`.
       */
      guard: (context: CollectionGuardContext) => any | Promise<any>
    }

export interface CollectionSearch {
  /**
   * The name of the field used for generating search keywords.
   */
  field: string

  /**
   * A function that generates keywords from the field value.
   *
   * It accepts a `context` argument, which includes the following:
   *
   * - `definition` - The resolved field definition object.
   * - `fields` - An object representing all field definitions using key-value pairs.
   * - `options` - The resolved field options used when declaring the field in a collection or block.
   * - `record` - The current record containing all fields with the specified `fieldValueType`.
   * - `value` - The field value (casted or populated, based on the `fieldValueType` parameter).
   *
   * By default, the field's `extractKeywords` function is used.
   */
  extractKeywords?: (context: ExtractKeywordsContext) => string | Promise<string>

  /**
   * Specifies whether to use casted or populated field values.
   * When using a custom `extractKeywords` function, both `value` and `record` in the `context` argument will have the specified field value type.
   *
   * @default 'casted'
   */
  fieldValueType?: 'casted' | 'populated'

  /**
   * Number of characters to reserve for the generated keywords.
   *
   * By default, no characters are reserved.
   *
   * @default undefined
   */
  reserve?: number
}

export type FieldLayout = string | string[] | Record<string, FieldLayout[]>

export interface DuplicateContext {
  /**
   * The original record to duplicate.
   */
  record: Record<string, any>

  /**
   * Utility function for creating a new query builder.
   */
  query: typeof query
}

export interface MirrorTranslationContext {
  /**
   * The original record to create a translation from.
   */
  from: Record<string, any>

  /**
   * The translated record to create or update.
   */
  to: Record<string, any> | null

  /**
   * The language code of the `to` translation.
   */
  language: SupportedLanguage

  /**
   * Utility function for creating a new query builder.
   */
  query: typeof query
}

export type ResolvedCollectionDefinition = Required<Omit<MultiEntryCollectionDefinition, 'dashboard'>> & {
  label: Required<MultiEntryCollectionDefinition['label']> & {
    collection: { singular: string; plural: string }
    record: { singular: string; plural: string }
  }
  apiRoutes: Required<MultiEntryCollectionDefinition['apiRoutes']> & object
  dashboard: {
    visible: boolean
    icon: PruviousIcon
    primaryField?: string
    fieldLayout: FieldLayout[]
    overviewTable: {
      columns: { field: string; width?: number }[]
      sort: { field: string; direction: 'asc' | 'desc' }
      perPage: number
      searchLabel: [string, string | null]
      additionalTableRowOptionsVueComponent?: string
    }
    additionalRecordOptionsVueComponent?: string
  }
}

/**
 * Create a new collection.
 */
export function defineCollection(definition: CollectionDefinition): ResolvedCollectionDefinition {
  const d = definition as MultiEntryCollectionDefinition
  const translatable = d.translatable ?? false
  const createdAtField = d.createdAtField ?? 'createdAt'
  const updatedAtField = d.updatedAtField ?? 'updatedAt'
  const timestamps: Record<string, CollectionField> = {}
  const defaultLabel = isString(d.label) ? d.label : titleCase(d.name, false).toLowerCase()
  const label = {
    collection:
      isObject(d.label) && isObject(d.label.collection)
        ? d.label.collection
        : isObject(d.label) && isString(d.label.collection)
        ? { singular: pluralize.singular(d.label.collection), plural: d.label.collection }
        : { singular: pluralize.singular(defaultLabel), plural: defaultLabel },
    record:
      isObject(d.label) && isObject(d.label.record)
        ? d.label.record
        : isObject(d.label) && isString(d.label.record)
        ? { singular: pluralize.singular(d.label.record), plural: d.label.record }
        : { singular: pluralize.singular(defaultLabel), plural: defaultLabel },
  }

  if (createdAtField) {
    timestamps[createdAtField] = {
      type: 'date-time',
      options: {
        label: 'Created at',
        description: `The timestamp indicating when the ${label.record.singular} was created.`,
      },
      additional: {
        index: true,
        immutable: true,
        validators: [
          {
            onCreate: true,
            validator: ({ __, language }) => {
              throw new Error(__(language, 'pruvious-server', 'This field is read-only'))
            },
          },
        ],
      },
    }
  }

  if (updatedAtField) {
    timestamps[updatedAtField] = {
      type: 'date-time',
      options: {
        label: 'Updated at',
        description: `The timestamp indicating when the ${label.record.singular} was last updated.`,
      },
      additional: {
        index: true,
        immutable: true,
        validators: [
          {
            onCreate: true,
            validator: ({ __, language }) => {
              throw new Error(__(language, 'pruvious-server', 'This field is read-only'))
            },
          },
        ],
      },
    }
  }

  const baseFields: Record<string, CollectionField> = {
    id: {
      type: 'number',
      options: {
        label: 'ID',
        description: `The unique identifier of the ${label.record.singular}.`,
      },
      additional: {
        immutable: true,
        validators: [
          {
            onCreate: true,
            validator: ({ __, language }) => {
              throw new Error(__(language, 'pruvious-server', 'This field is read-only'))
            },
          },
        ],
      },
    },
    language: {
      type: 'select',
      options: {
        description: [
          'The language code associated with this collection record.',
          '',
          'If not provided, the code of the primary language will be used.',
        ],
        default: primaryLanguage,
        choices: Object.fromEntries(languageLabels.map(({ code, name }) => [code, name])),
      },
      additional: {
        index: translatable,
        immutable: true,
        nullable: false,
        validators: [
          ({ __, language, value }) => {
            if (!translatable && value !== primaryLanguage) {
              throw new Error(__(language, 'pruvious-server', 'This collection does not support translations'))
            }
          },
        ],
      },
    },
  }

  if (d.mode === 'multi') {
    baseFields.translations = {
      type: 'text',
      options: {
        description:
          d.mode === 'multi'
            ? [
                'Represents a unique identifier that groups records as translations of each other.',
                'When populated, this field resolves to a key-value object.',
                "The key represents he language code, and the value is the corresponding record's ID or `null` if no record in this language exists.",
                '',
                'If the collection is not translatable, the populated value is `null`.',
                '',
                'Defaults to an automatically generated unique string.',
              ]
            : [
                'Represents a unique identifier that groups records as translations of each other.',
                '',
                'Defaults to an automatically generated unique string.',
              ],
      },
      additional: {
        unique: 'perLanguage',
        immutable: true,
        nullable: false,
        sanitizers: [({ value }) => value || nanoid()],
        validators: [
          async (context) =>
            uniqueValidator(context, context.__(context.language, 'pruvious-server', 'The translation already exists')),
        ],
        population: {
          type: { js: 'object', ts: 'Record<SupportedLanguage, number | null> | null' },
          populator: async ({ value, currentQuery }) => {
            if (d.translatable && isString(value)) {
              const translations: Record<SupportedLanguage, number> = Object.fromEntries(
                supportedLanguages.map((language) => [language, null]),
              ) as any

              for (const { id, language } of await (currentQuery as any)
                .clone()
                .reset()
                .select({ id: true, language: true })
                .where('translations', value)
                .all()) {
                if (isKeyOf(translations, language)) {
                  translations[language] = id
                }
              }

              return translations
            }

            return null
          },
        },
      },
    }
  }

  const customFields = objectOmit(d.fields, ['id', 'language', 'translations'])
  const fields = { ...baseFields, ...customFields, ...timestamps }

  const dashboard: ResolvedCollectionDefinition['dashboard'] = {
    visible: d.dashboard?.visible ?? true,
    icon: d.dashboard?.icon ?? (d.mode === 'multi' ? 'Pin' : 'Settings'),
    primaryField: d.dashboard?.primaryField,
    fieldLayout: d.dashboard?.fieldLayout ?? [
      ...Object.entries(fields)
        .filter(
          ([fieldName, field]) =>
            !field.additional?.protected &&
            (!d.contentBuilder || fieldName !== d.contentBuilder.blocksField) &&
            fieldName !== 'id' &&
            fieldName !== 'language' &&
            fieldName !== 'translations' &&
            fieldName !== createdAtField &&
            fieldName !== updatedAtField,
        )
        .map(([fieldName]) => fieldName),
      ...(d.contentBuilder ? ['translations'] : []),
    ],
    overviewTable: {
      columns: d.dashboard?.overviewTable?.columns?.map((item) => (isString(item) ? { field: item } : item)) ?? [
        ...(Object.keys(customFields).length
          ? Object.entries(customFields)
              .filter(([_, field]) => !field.additional?.protected)
              .slice(0, 6 - Object.keys(timestamps).length)
              .map(([fieldName], i) => ({ field: fieldName, width: i === 0 ? 30 : undefined }))
          : [{ field: 'id' }]),
        ...Object.keys(timestamps).map((field) => ({ field, width: 13 })),
      ],
      sort: d.dashboard?.overviewTable?.sort ?? {
        field: createdAtField || updatedAtField || Object.keys(customFields)[0] || 'id',
        direction: 'desc',
      },
      perPage: d.dashboard?.overviewTable?.perPage ?? 50,
      searchLabel: d.dashboard?.overviewTable?.searchLabel
        ? isString(d.dashboard?.overviewTable.searchLabel)
          ? [d.dashboard?.overviewTable.searchLabel, null]
          : d.dashboard?.overviewTable.searchLabel
        : [Object.keys(customFields)[0] ?? 'id', null],
      additionalTableRowOptionsVueComponent: d.dashboard?.overviewTable?.additionalTableRowOptionsVueComponent,
    },
    additionalRecordOptionsVueComponent: d.dashboard?.additionalRecordOptionsVueComponent,
  }

  return {
    name: d.name,
    label,
    mode: d.mode,
    fields,
    translatable,
    apiRoutes: {
      create: d.apiRoutes === false ? false : isDefined(d.apiRoutes?.create) ? d.apiRoutes!.create : 'private',
      createMany:
        d.apiRoutes === false ? false : isDefined(d.apiRoutes?.createMany) ? d.apiRoutes!.createMany : 'private',
      read: d.apiRoutes === false ? false : isDefined(d.apiRoutes?.read) ? d.apiRoutes!.read : 'private',
      readMany: d.apiRoutes === false ? false : isDefined(d.apiRoutes?.readMany) ? d.apiRoutes!.readMany : 'private',
      update: d.apiRoutes === false ? false : isDefined(d.apiRoutes?.update) ? d.apiRoutes!.update : 'private',
      updateMany:
        d.apiRoutes === false ? false : isDefined(d.apiRoutes?.updateMany) ? d.apiRoutes!.updateMany : 'private',
      delete: d.apiRoutes === false ? false : isDefined(d.apiRoutes?.delete) ? d.apiRoutes!.delete : 'private',
      deleteMany:
        d.apiRoutes === false ? false : isDefined(d.apiRoutes?.deleteMany) ? d.apiRoutes!.deleteMany : 'private',
    },
    guards: d.guards ?? [],
    publicPages: d.publicPages
      ? {
          pathField: d.publicPages.pathField ?? 'path',
          pathPrefix: isString(d.publicPages.pathPrefix)
            ? joinRouteParts(d.publicPages.pathPrefix).slice(1)
            : isObject(d.publicPages.pathPrefix)
            ? (Object.fromEntries(
                Object.entries(d.publicPages.pathPrefix).map(([language, prefix]) => [
                  language,
                  joinRouteParts(prefix).slice(1),
                ]),
              ) as any)
            : '',
          publicField: d.publicPages.publicField ?? false,
          draftTokenField: d.publicPages.draftTokenField ?? false,
          publishDateField: d.publicPages.publishDateField ?? false,
          layoutField: d.publicPages.layoutField ?? false,
          additionalFields: d.publicPages.additionalFields ?? [],
          seo: d.publicPages.seo,
        }
      : false,
    contentBuilder: d.contentBuilder ? { allowedBlocks: '*', rootBlocks: '*', ...d.contentBuilder } : false,
    dashboard,
    createdAtField,
    updatedAtField,
    cacheQueries: d.cacheQueries ?? 10,
    clearCacheRules: d.clearCacheRules ?? { onCreate: true, onUpdate: true, onDelete: true },
    nonCachedFields: d.nonCachedFields ?? [],
    search: d.search ?? false,
    compositeIndexes: d.compositeIndexes ?? [],
    uniqueCompositeIndexes: d.uniqueCompositeIndexes ?? [],
    duplicate: d.duplicate ?? false,
    mirrorTranslation: d.mirrorTranslation ?? (({ from, language }) => ({ ...from, language })),
  }
}
