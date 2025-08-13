import type { LayoutKey } from '#build/types/layouts'
import {
  walkFieldLayoutItems,
  type FieldsLayout,
  type LanguageCode,
  type Permission,
  type Templates,
  type TranslatableStringCallbackContext,
} from '#pruvious/server'
import type { icons } from '@iconify-json/tabler/icons.json'
import {
  Collection,
  type CollectionDefinition,
  type CollectionHooks,
  type Context,
  type Database,
  type ExtractCastedTypes,
  type ExtractInputTypes,
  type GenericField,
  type InsertInput,
} from '@pruvious/orm'
import {
  camelCase,
  deepClone,
  defu,
  isArray,
  isDefined,
  isObject,
  isPositiveInteger,
  isString,
  isUndefined,
  kebabCase,
  omit,
  setProperty,
  type DeepRequired,
  type DefaultFalseWithOptions,
  type DefaultTrue,
  type PartialMax4Levels,
} from '@pruvious/utils'
import { colorize } from 'consola/utils'
import { hash } from 'ohash'
import { isDevelopment } from 'std-env'
import { httpStatusCodeMessages } from '../api/utils.server'
import { resolveCustomComponentPath } from '../components/utils.server'
import { warnWithContext } from '../debug/console'
import {
  authorFieldPreset,
  createdAtFieldPreset,
  editorsFieldPreset,
  isPublicFieldPreset,
  languageFieldPreset,
  scheduledAtFieldPreset,
  seoFieldPreset,
  subpathFieldPreset,
  translationsFieldPreset,
  updatedAtFieldPreset,
  type AuthorFieldPresetOptions,
  type CreatedAtFieldPresetOptions,
  type EditorsFieldPresetOptions,
  type IsPublicFieldPresetOptions,
  type ScheduledAtFieldPresetOptions,
  type SEOFieldPresetOptions,
  type SubpathFieldPresetOptions,
  type UpdatedAtFieldPresetOptions,
} from '../fields/presets'
import type { ResolveFromLayersResultContextBinding } from '../utils/resolve'
import { collectionPermissionGuard } from './guards'

export type DefineCollectionOptions<
  TFields extends Record<string, GenericField>,
  TTranslatable extends boolean | undefined,
  TCreatedAt extends boolean | (CreatedAtFieldPresetOptions & BaseCreatedAtFieldOptions) | undefined,
  TUpdatedAt extends boolean | (UpdatedAtFieldPresetOptions & BaseEditorsFieldOptions) | undefined,
  TAuthor extends boolean | (AuthorFieldPresetOptions & BaseEditorsFieldOptions) | undefined,
  TEditors extends boolean | (EditorsFieldPresetOptions & BaseEditorsFieldOptions) | undefined,
  TIsPublic extends boolean | (IsPublicFieldPresetOptions & BaseIsPublicFieldOptions) | undefined,
  TScheduledAt extends boolean | ScheduledAtFieldPresetOptions | undefined,
  TSEO extends boolean | SEOFieldPresetOptions | undefined,
  TRouting extends
    | boolean
    | CollectionRoutingOptions<
        PublicRoutingFieldNames<
          TFields,
          TTranslatable,
          TCreatedAt,
          TUpdatedAt,
          TAuthor,
          TEditors,
          TIsPublic,
          TScheduledAt,
          TSEO
        >,
        TIsPublic,
        TScheduledAt,
        TSEO
      >
    | undefined,
> = Omit<CollectionDefinition<TFields, CollectionMeta>, 'meta'> & {
  /**
   * A key-value object of `Field` instances representing the structure of the collection.
   *
   * - Object keys represent the field names.
   *   - They must be in camelCase format.
   *   - Maximum length is 63 characters.
   *   - The `id` field is reserved and automatically created as the primary key.
   * - Object values are instances of the `Field` class.
   *
   * @example
   * ```ts
   * {
   *   email: textField({
   *     required: true,
   *     validators: [emailValidator(), uniqueValidator()],
   *   }),
   *   roles: recordsField({
   *     collection: 'Roles',
   *     fields: ['id', 'name', 'permissions'],
   *   }),
   * }
   * ```
   */
  fields: TFields
} & CollectionMetaOptions<
    TFields,
    TTranslatable,
    TCreatedAt,
    TUpdatedAt,
    TAuthor,
    TEditors,
    TIsPublic,
    TScheduledAt,
    TSEO,
    TRouting
  > & {
    createdAt?: CreatedAtFieldPresetOptions & BaseCreatedAtFieldOptions
    updatedAt?: UpdatedAtFieldPresetOptions & BaseUpdatedAtFieldOptions
    author?: AuthorFieldPresetOptions & BaseAuthorFieldOptions
    editors?: EditorsFieldPresetOptions & BaseEditorsFieldOptions
    routing?: TRouting extends boolean
      ? boolean
      : CollectionRoutingOptions<
          PublicRoutingFieldNames<
            TFields,
            TTranslatable,
            TCreatedAt,
            TUpdatedAt,
            TAuthor,
            TEditors,
            TIsPublic,
            TScheduledAt,
            TSEO
          >,
          TIsPublic,
          TScheduledAt,
          TSEO
        >
  }

export interface CollectionMetaOptions<
  TFields extends Record<string, GenericField>,
  TTranslatable extends boolean | undefined,
  TCreatedAt extends boolean | (CreatedAtFieldPresetOptions & BaseCreatedAtFieldOptions) | undefined,
  TUpdatedAt extends boolean | (UpdatedAtFieldPresetOptions & BaseUpdatedAtFieldOptions) | undefined,
  TAuthor extends boolean | (AuthorFieldPresetOptions & BaseAuthorFieldOptions) | undefined,
  TEditors extends boolean | (EditorsFieldPresetOptions & BaseEditorsFieldOptions) | undefined,
  TIsPublic extends boolean | (IsPublicFieldPresetOptions & BaseIsPublicFieldOptions) | undefined,
  TScheduledAt extends boolean | ScheduledAtFieldPresetOptions | undefined,
  TSEO extends boolean | SEOFieldPresetOptions | undefined,
  TRouting extends
    | boolean
    | CollectionRoutingOptions<
        PublicRoutingFieldNames<
          TFields,
          TTranslatable,
          TCreatedAt,
          TUpdatedAt,
          TAuthor,
          TEditors,
          TIsPublic,
          TScheduledAt,
          TSEO
        >,
        TIsPublic,
        TScheduledAt,
        TSEO
      >
    | undefined,
> {
  /**
   * Specifies whether the collection is translatable.
   *
   * When set to `true`, each translation is stored as an individual database record for each language
   * specified in the `pruvious.i18n.languages` option in `nuxt.config.ts`.
   *
   * Additionally, the following fields are automatically added to the collection:
   *
   * - `translations` - A unique key that identifies the translation record.
   * - `language` - The language code of the translation record.
   *
   * @default true
   */
  translatable?: TTranslatable

  /**
   * Specifies which fields should stay in sync across all translations.
   * When you change a synced field in one translation, the same change happens automatically in all other translations.
   * This feature only works if the collection is `translatable`.
   *
   * Important: Ensure that synced fields do not contain `conditionalLogic` or `dependencies` that require other fields in the input data.
   * Having such dependencies may cause the sync operation to fail.
   *
   * @default []
   */
  syncedFields?: (keyof MergeCollectionFields<
    TFields,
    TTranslatable,
    TCreatedAt,
    TUpdatedAt,
    TAuthor,
    TEditors,
    TIsPublic,
    TScheduledAt,
    TSEO,
    TRouting
  > &
    string)[]

  /**
   * API endpoint configuration for this collection.
   * Controls which CRUD operations are enabled via HTTP endpoints.
   * All endpoints are enabled by default and use guarded query builder functions.
   *
   * Standard REST API endpoints:
   *
   * - POST `/<pruvious.api.basePath>/collections/{slug}`
   *   - Creates one or more collection records.
   * - GET `/<pruvious.api.basePath>/collections/{slug}`
   *   - Lists/searches collection records.
   * - GET `/<pruvious.api.basePath>/collections/{slug}/:id`
   *   - Retrieves a single record by ID.
   * - GET `/<pruvious.api.basePath>/collections/{slug}/:id/copy-translation?targetLanguage&operation`
   *   - Generates and retrieves a translated copy of a record by ID for a specified target language and operation.
   *   - Only available when the collection is `translatable` and `copyTranslation` is enabled.
   * - GET `/<pruvious.api.basePath>/collections/{slug}/:id/duplicate`
   *   - Generates and retrieves a duplicate of a record by ID.
   *   - Only available when the `duplicate` function is enabled.
   * - PATCH `/<pruvious.api.basePath>/collections/{slug}`
   *   - Bulk updates multiple records.
   * - PATCH `/<pruvious.api.basePath>/collections/{slug}/:id`
   *   - Updates a single record by ID.
   * - DELETE `/<pruvious.api.basePath>/collections/{slug}`
   *   - Bulk deletes multiple records.
   * - DELETE `/<pruvious.api.basePath>/collections/{slug}/:id`
   *   - Deletes a single record by ID.
   *
   * Additional POST endpoints:
   *
   * - POST `/<pruvious.api.basePath>/collections/{slug}/query/create`
   *   - Creates one or more collection records.
   * - POST `/<pruvious.api.basePath>/collections/{slug}/query/read`
   *   - Lists/searches collection records.
   * - POST `/<pruvious.api.basePath>/collections/{slug}/query/update`
   *   - Bulk updates multiple records.
   * - POST `/<pruvious.api.basePath>/collections/{slug}/query/delete`
   *   - Bulk deletes multiple records.
   * - POST `/<pruvious.api.basePath>/collections/{slug}/validate/create`
   *   - Validates new record data without saving it to the database.
   * - POST `/<pruvious.api.basePath>/collections/{slug}/validate/update`
   *   - Validates record update data without saving it to the database.
   * - POST `/<pruvious.api.basePath>/collections/{slug}/validate/update/:id`
   *   - Validates update data for a specific record ID without saving it to the database.
   *
   * The `query/{operation}` endpoints allow query parameters to be sent in the request body instead of the URL.
   * The request body must be a JSON object with:
   *
   * - `query` - Object containing query parameters that would normally go in the URL.
   * - `data` - Object containing the regular request payload data.
   *
   * The created endpoints are only accessible to users with `collection:{slug}:{operation}` permissions.
   *
   * The dashboard will automatically enable/disable the corresponding UI elements based on these settings.
   *
   * You can provide a boolean value to enable/disable all endpoints.
   *
   * @default
   * { create: true, read: true, update: true, delete: true }
   */
  api?:
    | boolean
    | {
        /**
         * Enables/disables record creation via POST endpoint.
         * When enabled, the following endpoints are available:
         *
         * - POST `/<pruvious.api.basePath>/collections/{slug}`
         *   - The request body must be a single object or an array of objects to create.
         * - POST `/<pruvious.api.basePath>/collections/{slug}/query/create`
         *   - The request body must be a JSON object with `query` and `data` keys.
         *     - The `query` object contains query parameters that would normally go in the URL.
         *     - The `data` object contains a single object or an array of objects to create.
         * - POST `/<pruvious.api.basePath>/collections/{slug}/validate/create`
         *   - The request body must be a single object or an array of objects to validate.
         *
         * Both endpoints support creating either a single record or multiple records in a single request.
         *
         * Available query parameters:
         *
         * - `returning` - Fields to return after the INSERT operation (e.g. `?returning=id,name`).
         * - `populate` - Determines if the query should run field populators and return populated field values (e.g. `?populate=true`).
         *
         * Only users with `collection:{slug}:create` permission can access these endpoints.
         *
         * @see https://pruvious.com/docs/collections/api#create (@todo set up this link)
         *
         * @default true
         */
        create?: boolean

        /**
         * Enables/disables record retrieval via GET endpoints.
         * When enabled, the following endpoints are available:
         *
         * - GET `/<pruvious.api.basePath>/collections/{slug}` - retrieves multiple records.
         * - GET `/<pruvious.api.basePath>/collections/{slug}/:id` - retrieves a single record by ID.
         * - GET `/<pruvious.api.basePath>/collections/{slug}/:id/copy-translation?targetLanguage&operation` - retrieves a translated copy of
         *   a record by ID for a specified target language and operation.
         *   - Only available when the collection is `translatable` and `copyTranslation` is enabled.
         * - GET `/<pruvious.api.basePath>/collections/{slug}/:id/duplicate` - retrieves a duplicate of a record by ID.
         *   - Only available when the `duplicate` function is enabled.
         * - POST `/<pruvious.api.basePath>/collections/{slug}/query/read` - retrieves multiple records.
         *   - The request body is a JSON object with an optional `query` parameter.
         *     - The `query` object contains query parameters that would normally go in the URL.
         *
         * Common query parameters:
         *
         * - `select` - Fields to retrieve (e.g. `?select=id,name`).
         * - `populate` - Determines if the query should run field populators and return populated field values (e.g. `?populate=true`).
         *
         * Multi-record query parameters:
         *
         * - `where` - Filtering conditions for the query (e.g. `?where=category[=][2]`).
         * - `search` - Search condition for the results (e.g. `?search=keyword[in][name]`).
         * - `groupBy` - Fields to group by (e.g. `?groupBy=category`).
         * - `orderBy` - Fields to order by (e.g. `?orderBy=name:asc`).
         * - `orderByRelevance` - Whether to order search results by relevance (e.g. `?orderByRelevance=high`).
         * - `limit` - The maximum number of rows to return (e.g. `?limit=10`).
         * - `offset` - The number of rows to skip before returning results (e.g. `?offset=10`).
         * - `page` - The page number for paginated results (e.g. `?page=2`).
         * - `perPage` - The number of items to display per page (e.g. `?perPage=10`).
         *
         * Only users with `collection:{slug}:read` permission can access these endpoints.
         *
         * @see https://pruvious.com/docs/collections/api#read (@todo set up this link)
         *
         * @default true
         */
        read?: boolean

        /**
         * Enables/disables record updates via PATCH endpoints.
         * When enabled, the following endpoints are available:
         *
         * - PATCH `/<pruvious.api.basePath>/collections/{slug}` - updates multiple records.
         *   - The request body must be an object with the new field values.
         * - PATCH `/<pruvious.api.basePath>/collections/{slug}/:id` - updates a single record by ID.
         *   - The request body must be an object with the new field values.
         * - POST `/<pruvious.api.basePath>/collections/{slug}/query/update` - updates multiple records.
         *   - The request body must be a JSON object with `query` and `data` keys.
         *     - The `query` object contains query parameters that would normally go in the URL.
         *     - The `data` object contains an object with the new field values.
         * - POST `/<pruvious.api.basePath>/collections/{slug}/validate/update` - validates record update data without saving it to the database.
         *   - The request body must be an object with the new field values.
         * - POST `/<pruvious.api.basePath>/collections/{slug}/validate/update/:id` - validates update data for a specific record ID without saving it to the database.
         *   - The request body must be an object with the new field values.
         *
         * Common query parameters:
         *
         * - `returning` - Fields to return after the UPDATE operation (e.g. `?returning=id,name`).
         * - `populate` - Determines if the query should run field populators and return populated field values (e.g. `?populate=true`).
         *
         * Multi-record query parameters:
         *
         * - `where` - Filtering conditions for the query (e.g. `?where=category[=][2]`).
         *
         * Only users with `collection:{slug}:update` permission can access these endpoints.
         *
         * @see https://pruvious.com/docs/collections/api#update (@todo set up this link)
         *
         * @default true
         */
        update?: boolean

        /**
         * Enables/disables record deletion via DELETE endpoints.
         * When enabled, the following endpoints are available:
         *
         * - DELETE `/<pruvious.api.basePath>/collections/{slug}` - deletes multiple records.
         * - DELETE `/<pruvious.api.basePath>/collections/{slug}/:id` - deletes a single record by ID.
         * - POST `/<pruvious.api.basePath>/collections/{slug}/query/delete` - deletes multiple records.
         *   - The request body is a JSON object with an optional `query` parameter.
         *     - The `query` object contains query parameters that would normally go in the URL.
         *
         * Common query parameters:
         *
         * - `returning` - Fields to return after the DELETE operation (e.g. `?returning=id,name`).
         * - `populate` - Determines if the query should run field populators and return populated field values (e.g. `?populate=true`).
         *
         * Multi-record query parameters:
         *
         * - `where` - Filtering conditions for the query (e.g. `?where=category[=][2]`).
         *
         * Only users with `collection:{slug}:delete` permission can access these endpoints.
         *
         * @see https://pruvious.com/docs/collections/api#delete (@todo set up this link)
         *
         * @default true
         */
        delete?: boolean
      }

  /**
   * An array of functions that control access to database records in this collection.
   * These functions are only executed during CRUD operations when using the following utility functions from `#pruvious/server`:
   *
   * - `guardedQueryBuilder()`
   * - `guardedInsertInto(collection)`
   * - `guardedSelectFrom(collection)`
   * - `guardedUpdate(collection)`
   * - `guardedDeleteFrom(collection)`
   *
   * Every collection guard function receives the parameter:
   *
   * - `context` - A `MetaContext` instance related to the current query builder operation.
   *
   * The guard function does not require to return a value.
   * When it throws an error, the current query builder execution stops immediately.
   * It also sets the HTTP response status code to `401` or `403` by default.
   * The status code prefix will be stripped from the final error `message` in the response.
   *
   * ---
   *
   * A built-in authentication guard is enabled by default to manage user access through permissions for all collection operations:
   *
   * - `collection:{slug}:create` - Allows creating new records.
   * - `collection:{slug}:read` - Allows reading existing records.
   * - `collection:{slug}:update` - Allows modifying existing records.
   * - `collection:{slug}:delete` - Allows removing existing records.
   *
   * This guard only takes effect when the `authGuard` option is enabled.
   *
   * @see https://pruvious.com/docs/collections/guards (@todo set up this link)
   *
   * @example
   * ```ts
   * import { defineCollection } from '#pruvious/server'
   *
   * export default defineCollection({
   *   fields: {
   *     // ...
   *   },
   *   guards: [
   *     ({ _ }) => {
   *       if (!useEvent().context.pruvious.auth.isLoggedIn) {
   *         throw new Error(_('You must be logged in'))
   *       }
   *     },
   *   ],
   * })
   * ```
   */
  guards?: CollectionGuard[]

  /**
   * Specifies which CRUD operations are protected by default.
   * When enabled, users must be authenticated and have the required permissions to perform operations on collections:
   *
   * - `collection:{slug}:create` - Permission to create new records.
   * - `collection:{slug}:read` - Permission to read existing records.
   * - `collection:{slug}:update` - Permission to modify existing records.
   * - `collection:{slug}:delete` - Permission to remove existing records.
   *
   * Accepts either:
   *
   * - `boolean` - Enable/disable guard for all operations.
   * - `('create' | 'read' | 'update' | 'delete')[]` - Array of operation names to protect specifically.
   *
   * This protection is implemented as a collection guard that automatically applies to all defined collections.
   * It takes effect only when using these utility functions from `#pruvious/server`:
   *
   * - `guardedQueryBuilder()`
   * - `guardedInsertInto(collection)`
   * - `guardedSelectFrom(collection)`
   * - `guardedUpdate(collection)`
   * - `guardedDeleteFrom(collection)`
   *
   * @default true
   */
  authGuard?: boolean | ('create' | 'read' | 'update' | 'delete')[]

  /**
   * A function that generates a copy of record data, enabling translation mapping between different language versions.
   * When specified, the API endpoint GET `<pruvious.api.basePath>/collections/{slug}/:id/copy-translation?targetLanguage&operation`
   * becomes available for generating translated copies of records.
   * The source language is read directly from the source record, and the target language is specified in the query parameters.
   * The operation type is also specified in the query parameters and can be either `create` or `update`.
   *
   * The function receives a single `context` parameter with the following properties:
   *
   * - `source` - Object containing field names and their casted values from the source record.
   * - `sourceLanguage` - The language code of the source translation.
   * - `targetLanguage` - The language code of the target translation returned by this function.
   * - `operation` - Specifies whether the translation copy will be used for a `create` or `update` operation.
   *
   * The function must return an object containing the input data needed to either create or update the translated record.
   * Any fields marked as `autoGenerated` will be automatically excluded from the returned object.
   * If the `operation` is `update`, `immutable` fields will also be excluded.
   * The `language` and `translations` fields are handled automatically and should not be included in the returned object.
   *
   * Set to `null` to disable translation copying (default behavior).
   *
   * Note: The collection must be `translatable` for this function to have any effect.
   *
   * @default null
   *
   * @example
   * ```ts
   * ({ source }) => ({ ...source, foo: 'New value' })
   * ```
   */
  copyTranslation?: CollectionCopyTranslationFunction<
    MergeCollectionFields<
      TFields,
      TTranslatable,
      TCreatedAt,
      TUpdatedAt,
      TAuthor,
      TEditors,
      TIsPublic,
      TScheduledAt,
      TSEO,
      TRouting
    >
  > | null

  /**
   * A function that generates a duplicate of an existing record.
   * When specified, the API endpoint GET `<pruvious.api.basePath>/collections/{slug}/:id/duplicate`
   * becomes available for generating duplicates of records.
   *
   * The function receives a single `context` parameter with the following properties:
   *
   * - `source` - Object containing field names and their casted values from the source record.
   *
   * The function must return an object containing the input data needed to create a new record in the same collection.
   * Any fields marked as `autoGenerated` will be automatically excluded from the returned object.
   * If the collection is `translatable`, the `translations` and `language` fields are handled automatically.
   *
   * Set to `null` to disable record duplication (default behavior).
   *
   * @default null
   *
   * @example
   * ```ts
   * ({ source }) => ({ ...source, foo: 'New value' })
   * ```
   */
  duplicate?: CollectionDuplicateFunction<
    TTranslatable,
    MergeCollectionFields<
      TFields,
      TTranslatable,
      TCreatedAt,
      TUpdatedAt,
      TAuthor,
      TEditors,
      TIsPublic,
      TScheduledAt,
      TSEO,
      TRouting
    >
  > | null

  /**
   * Controls whether to log queries executed on this collection.
   * Logged queries can be viewed in the Pruvious dashboard by admins and users with the `read-logs` permission.
   * Requires `pruvious.debug.logs.queries` to be enabled in `nuxt.config.ts`.
   *
   * Use `true` or `false` to enable/disable query logging with default settings.
   * For advanced configuration, provide an object with these options:
   *
   * - `exposeData` - Store actual query parameters and results instead of type placeholders (default: `false`).
   * - `operations` - Specify which database operations should be logged (logs all by default).
   *
   * @default true
   */
  logs?:
    | boolean
    | {
        /**
         * Controls the visibility of query parameters and results in log entries.
         * When set to `false`, it stores their data types instead of actual values.
         *
         * Warning: Enabling this will include potentially sensitive information in logs.
         *
         * @default false
         */
        exposeData?: boolean

        /**
         * Specifies which database operations should be logged.
         * Logs all operations by default.
         *
         * @default
         * { insert: true, select: true, update: true, delete: true }
         */
        operations?: {
          /**
           * Log `INSERT` operations.
           *
           * @default true
           */
          insert?: boolean

          /**
           * Log `SELECT` operations.
           *
           * @default true
           */
          select?: boolean

          /**
           * Log `UPDATE` operations.
           *
           * @default true
           */
          update?: boolean

          /**
           * Log `DELETE` operations.
           *
           * @default true
           */
          delete?: boolean
        }
      }

  /**
   * Controls if the collection includes a `createdAt` timestamp field.
   * When creating a new record, this field automatically gets populated with the current timestamp.
   *
   * Available options:
   *
   * - `true` - Enables the field with default options.
   * - `{...}` - Configures custom options for the field.
   * - `false` - Disables the field completely.
   *
   * @default
   * {
   *   index: true,
   *   ui: {
   *     hidden: true,
   *     label: ({ __ }) => __('pruvious-dashboard', 'Created'),
   *     description: ({ __ }) => __('pruvious-dashboard', 'The date and time when the record was created.'),
   *   },
   * }
   */
  createdAt?: TCreatedAt

  /**
   * Controls if the collection includes an `updatedAt` timestamp field.
   * When updating an existing record, this field automatically gets updated with the current timestamp.
   *
   * Available options:
   *
   * - `true` - Enables the field with default options.
   * - `{...}` - Configures custom options for the field.
   * - `false` - Disables the field completely.
   *
   * @default
   * {
   *   index: false,
   *   ui: {
   *     hidden: true,
   *     label: ({ __ }) => __('pruvious-dashboard', 'Updated'),
   *     description: ({ __ }) => __('pruvious-dashboard', 'The date and time when the record was last updated.'),
   *   },
   * }
   */
  updatedAt?: TUpdatedAt

  /**
   * Controls if the collection includes an `author` field that stores the user who owns the record.
   *
   * When enabled, a filter is applied to all **guarded** query builder functions to prevent unauthorized access to records.
   * Additionally, the `collection:{slug}:manage` permission becomes available for user role assignments.
   *
   * The following rules apply:
   *
   * - Users can read all records but are restricted to updating and deleting only the records they own.
   *   - Users must also have `collection:{slug}:{read|update|delete}` permissions in order to perform these actions.
   *   - If the `author.strict` option is enabled, users cannot read records that they do not own.
   *   - If the `editors` option is enabled, editors can also read and update assigned records.
   *     - Editors cannot update the `author` field unless they are the author.
   *   - Administrators and users with the `collection:{slug}:manage` permission can bypass these limitations.
   * - Guarded query builder functions automatically exclude records where the `author` field does not match the current user.
   *   - This behavior is consistently applied across all default collection API endpoints.
   *   - Only administrators and users with the `collection:{slug}:manage` permission can bypass these filters.
   * - The `author` field is set to the current user on record creation, unless manually specified.
   *
   * Available options:
   *
   * - `true` - Enables the field with default options.
   * - `{...}` - Configures custom options for the field.
   * - `false` - Disables the field completely.
   *
   * @default false
   */
  author?: TAuthor

  /**
   * Controls if the collection includes an `editors` field that stores the users assigned as editors for the record.
   *
   * When enabled, a filter is applied to all **guarded** query builder functions to prevent unauthorized access to records.
   * Additionally, the `collection:{slug}:manage` permission becomes available for user role assignments.
   *
   * The following rules apply:
   *
   * - Users can read all records but are restricted to updating only assigned records.
   *   - Users must also have `collection:{slug}:{read|update}` permissions in order to perform these actions.
   *   - If the `editors.strict` option is enabled, users cannot read records where they are not assigned as editors.
   *   - If the `author` option is enabled, authors can also read, update, and delete records they own.
   *     - Editors cannot update the `author` field unless they are the author.
   *   - Administrators and users with the `collection:{slug}:manage` permission can bypass these limitations.
   * - Guarded query builder functions automatically exclude records where the current user is not assigned as an editor.
   *   - This behavior is consistently applied across all default collection API endpoints.
   *   - Only administrators and users with the `collection:{slug}:manage` permission can bypass these filters.
   *
   * Available options:
   *
   * - `true` - Enables the field with default options.
   * - `{...}` - Configures custom options for the field.
   * - `false` - Disables the field completely.
   *
   * @default false
   */
  editors?: TEditors

  /**
   * Controls whether routes can be assigned to this collection.
   * When a collection is referenced by a route, its records become accessible via the route's `$data` property.
   *
   * Available options:
   *
   * - `true` - Enables routing and exposes all custom collection `fields`,
   *            including the `id`, `createdAt`, and `updatedAt` fields,
   *            in the `$data` property of route records.
   * - `{...}` - Configures custom routing options.
   * - `false` - Disables routing completely.
   *
   * @see https://pruvious.com/docs/routing (@todo set up this link)
   *
   * @default false
   *
   * @example
   * ```vue
   * <template>
   *   <NuxtLayout>
   *     <pre>{{ proute }}</pre>
   *   </NuxtLayout>
   * </template>
   *
   * <script lang="ts" setup>
   * import { usePruviousRoute } from '#pruvious/client'
   *
   * const proute = usePruviousRoute()
   * </script>
   * ```
   */
  routing?: TRouting

  /**
   * Controls how the collection is displayed in the dashboard user interface.
   *
   * @default
   * {
   *   hidden: false,                 // Visible in the dashboard
   *   label: undefined,              // Automatically generated from the collection name
   *   icon: 'folder',
   *   menu: {
   *     hidden: false,
   *     group: 'collections',
   *     order: 10,
   *   },
   *   indexPage: {
   *     dashboardLayout: 'standard', // Standard dashboard layout with header and sidebar
   *   },
   *   createPage: {
   *     dashboardLayout: 'auto',     // Automatic layout selection based on routing support
   *     fieldsLayout: undefined,     // Display all fields in the order they are defined
   *   },
   *   updatePage: {
   *     dashboardLayout: 'auto',     // Automatic layout selection based on routing support
   *     fieldsLayout: undefined,     // Display all fields in the order they are defined
   *   },
   * }
   */
  ui?: PartialMax4Levels<
    CollectionUIOptions<
      keyof MergeCollectionFields<
        TFields,
        TTranslatable,
        TCreatedAt,
        TUpdatedAt,
        TAuthor,
        TEditors,
        TIsPublic,
        TScheduledAt,
        TSEO,
        TRouting
      > &
        string
    >
  >
}

export type CollectionGuard = (
  /**
   * A `MetaContext` instance related to the current query builder operation.
   */
  context: MetaContext,
) => any

type CollectionCopyTranslationFunction<
  TFields extends Record<string, GenericField>,
  TInsertInput extends Record<string, any> = InsertInput<{
    TInputTypes: ExtractInputTypes<TFields>
    fields: TFields
  }>,
> = (context: {
  /**
   * Object containing field names and their casted values from the source translation.
   */
  source: ExtractCastedTypes<TFields> & { id: number }

  /**
   * The language code of the source translation.
   */
  sourceLanguage: LanguageCode

  /**
   * The language code of the target translation returned by this function.
   */
  targetLanguage: LanguageCode

  /**
   * Specifies whether the translation copy will be used for a `create` or `update` operation.
   */
  operation: 'create' | 'update'
}) =>
  | Partial<Omit<TInsertInput, 'language' | 'translations'>>
  | Promise<Partial<Omit<TInsertInput, 'language' | 'translations'>>>

type CollectionDuplicateFunction<
  TTranslatable extends boolean | undefined,
  TFields extends Record<string, GenericField>,
  TInsertInput extends Record<string, any> = InsertInput<{
    TInputTypes: ExtractInputTypes<TFields>
    fields: TFields
  }>,
> = (context: {
  /**
   * Object containing field names and their casted values from the source record.
   */
  source: ExtractCastedTypes<TFields> & { id: number }
}) => DefaultTrue<TTranslatable> extends true
  ? Omit<TInsertInput, 'language' | 'translations'> | Promise<Omit<TInsertInput, 'language' | 'translations'>>
  : TInsertInput | Promise<TInsertInput>

interface OrderBy<TFieldNames extends string> {
  /**
   * The field (column) name to order by.
   */
  field: TFieldNames | 'id'

  /**
   * The direction to order by.
   *
   * @default 'asc'
   */
  direction?: 'asc' | 'desc'

  /**
   * The order of null values.
   *
   * - `nullsAuto` - Null values are ordered based on the specified direction (`nullsFirst` for `asc`, `nullsLast` for `desc`).
   * - `nullsFirst` - Null values are ordered first.
   * - `nullsLast` - Null values are ordered last.
   *
   * @default 'nullsAuto'
   */
  nulls?: 'nullsAuto' | 'nullsFirst' | 'nullsLast'
}

export interface CollectionUIOptions<TFieldNames extends string = string> {
  /**
   * Controls if the collection should be hidden in the admin dashboard.
   * When `true`, the collection will not be visible in the navigation menu and its dashboard pages become inaccessible.
   *
   * @default false
   */
  hidden: boolean

  /**
   * Sets the visible label text for the collection in the dashboard.
   *
   * If not specified, the collection name will be automatically transformed to Title case and used as the label.
   * The resulting label is wrapped in the translation function `__('pruvious-dashboard', label)`.
   * This transformation happens in the Vue component.
   *
   * You can either provide a string or a function that returns a string.
   * The function receives an object with `_` and `__` properties to access the translation functions.
   *
   * Important: When using a function, only use simple anonymous functions without context binding,
   * since the option needs to be serialized for client-side use.
   *
   * @example
   * ```ts
   * // String (non-translatable)
   * label: 'Theme options'
   *
   * // Function (translatable)
   * label: ({ __ }) => __('pruvious-dashboard', 'Theme options')
   *
   * // Collection name transformation (default)
   * // Example: the collection name `MyCollection` is transformed into `__('pruvious-dashboard', 'My collection')`
   * label: undefined
   * ```
   */
  label: string | ((context: TranslatableStringCallbackContext) => string) | undefined

  /**
   * The icon used to represent the collection in the dashboard.
   * Must be a valid Tabler icon name.
   *
   * @see https://tabler-icons.io for available icons
   *
   * @default 'folder'
   */
  icon: keyof typeof icons

  /**
   * Options to customize how the collection appears in the dashboard's navigation menu.
   *
   * For more advanced menu customization, use the client-side filters:
   *
   * - `dashboard:menu:general`
   * - `dashboard:menu:collections`
   * - `dashboard:menu:management`
   * - `dashboard:menu:utilities`
   *
   * @default
   * {
   *   hidden: false,
   *   group: 'collections',
   *   order: 10,
   * }
   */
  menu: {
    /**
     * Controls whether the collection should be hidden in the dashboard navigation menu.
     * Set to `true` to hide it, `false` to show it.
     *
     * @default false
     */
    hidden: boolean

    /**
     * Defines the menu category where the collection will be displayed in the dashboard sidebar.
     *
     * @default 'collections'
     */
    group: 'general' | 'collections' | 'management' | 'utilities'

    /**
     * Controls the collection's position in the dashboard navigation menu.
     * Items with lower numbers appear at the top.
     * When items have the same order number, they are sorted by their label alphabetically.
     *
     * @default 10
     */
    order: number
  }

  /**
   * Settings that control how collection records are displayed and organized in the dashboard's listing page.
   * This includes column configurations, sorting preferences, filters, and other display options.
   *
   * @default
   * {
   *   dashboardLayout: 'standard', // Standard dashboard layout with header and sidebar
   * }
   */
  indexPage: {
    /**
     * The dashboard layout used when listing collection records.
     * By default, it displays a data table with pagination and filtering options.
     *
     * Available options:
     *
     * - `'standard'` - Standard dashboard layout with header and sidebar (`PruviousDashboardPage.vue`).
     * - `resolvePruviousComponent('>/components/MyComponent.vue')` - Custom Vue component.
     *   - The component must be resolved using `resolvePruviousComponent()` or `resolveNamedPruviousComponent()`.
     *   - The import path must be a literal string, not a variable.
     *   - The import path can be an absolute or relative to the definition file.
     *
     * The custom component receives the following props:
     *
     * - @todo
     *
     * @default 'standard'
     */
    dashboardLayout: 'standard' | (string & {})

    table: {
      /**
       * Defines which columns are shown in the table.
       * The order of columns is determined by the order they are defined in the array.
       *
       * You can provide an array of field names or objects to configure the columns.
       * When using field names as strings, you can use the format `fieldName | width | minWidth`.
       * The `width` and `minWidth` values are optional CSS values.
       *
       * When not explicitly configured:
       *
       * - If `routing` is enabled, the `subpath` and `isPublic` fields are always shown first.
       * - Shows first 2-5 visible (not `hidden`) custom fields in their original definition order.
       * - If `createdAt` field is enabled, it appears as the rightmost column.
       *
       * @default undefined
       *
       * @example
       * ```ts
       * [
       *   'firstName | 320px',
       *   'lastName',
       *   { field: 'isActive', label: ({ __ }) => __('pruvious-dashboard', 'Active') },
       * ]
       * ```
       */
      columns:
        | (
            | ((
                | {
                    /**
                     * The field (column) to display.
                     */
                    field: TFieldNames | 'id'
                  }
                | {
                    /**
                     * Custom component to render in the table column.
                     * The component must be resolved using `resolvePruviousComponent()` or `resolveNamedPruviousComponent()`.
                     *
                     * The following rules apply:
                     *
                     * - The function name (`resolvePruviousComponent` or `resolveNamedPruviousComponent`) must remain unchanged and not be aliased.
                     * - The import `path` must be a literal string, not a variable.
                     * - The import `path` can be:
                     *   - A path starting with the alias `>/`.
                     *     - This path is resolved relative to the `<srcDir>` directory of the Nuxt layer where the function is called.
                     *   - A path starting with the Nuxt alias `@/` or `~/`.
                     *     - This path is resolved relative to the first matching `<srcDir>` directory in the Nuxt layer hierarchy.
                     *   - An absolute path to a `.vue` component.
                     *   - A path for an npm module.
                     * - When working within the `<sharedDir>` directory, always use `resolveNamedPruviousComponent()` instead of `resolvePruviousComponent()`.
                     *
                     * The custom component receives the following props:
                     *
                     * - @todo
                     *
                     * @example
                     * ```ts
                     * import { resolvePruviousComponent } from '#pruvious/server'
                     *
                     * // Correct
                     * resolvePruviousComponent('>/components/MyComponent.vue')
                     * resolvePruviousComponent('/Project/app/components/MyComponent.vue')
                     *
                     * // Incorrect
                     * resolvePruviousComponent(`>/components/${name}.vue`)
                     * resolvePruviousComponent('MyComponent')
                     * ```
                     */
                    component: string

                    /**
                     * A unique key to identify the custom column component.
                     * It must start with the `$` character.
                     */
                    key: `$${string}`
                  }
              ) & {
                /**
                 * A custom text label shown in the table header column.
                 * If not provided, falls back to using the `field` label when one exists.
                 *
                 * You can either provide a string or a function that returns a string.
                 * The function receives an object with `_` and `__` properties to access the translation functions.
                 *
                 * Important: When using a function, only use simple anonymous functions without context binding,
                 * since the option needs to be serialized for client-side use.
                 *
                 * @default undefined
                 *
                 * @example
                 * ```ts
                 * // String (non-translatable)
                 * label: 'Custom label'
                 *
                 * // Function (translatable)
                 * label: ({ __ }) => __('pruvious-dashboard', 'Custom label')
                 * ```
                 */
                label?: string | ((context: TranslatableStringCallbackContext) => string) | undefined

                /**
                 * Sets the width of a table column using CSS values like `100px`, `20rem`, `50%`, `auto`, etc.
                 * The specified `width` is applied to the `style` attribute of `<col>` elements within the `<colgroup>`.
                 */
                width?: string

                /**
                 * Sets the minimum width of a table column using CSS values like `100px`, `20rem`, etc.
                 * The specified `min-width` is applied to the `style` attribute of `<col>` elements within the `<colgroup>`.
                 *
                 * The `minWidth` property is useful for specifying `width` in percentages while ensuring a minimum width for the column.
                 *
                 * The default value (16rem) is only used when the `width` property is not specified.
                 *
                 * @default '16rem'
                 */
                minWidth?: string
              })
            | TFieldNames
            | 'id'
            | `${TFieldNames | 'id'} | ${string}`
          )[]
        | undefined

      /**
       * Specifies how records should be sorted by default.
       *
       * You can provide an object with the following properties:
       *
       * - `field` - The field (column) name to order by.
       * - `direction` - The direction to order by.
       * - `nulls` - The order of null values.
       *
       * Alternatively, you can provide a string with the following format:
       *
       * - `{field}` - Uses the field in ascending order (null values are ordered first).
       * - `{field}:asc` - Uses the field in ascending order (null values are ordered first).
       * - `{field}:asc:nullsAuto` - Uses the field in ascending order (null values are ordered first).
       * - `{field}:asc:nullsFirst` - Uses the field in ascending order (null values are ordered first).
       * - `{field}:asc:nullsLast` - Uses the field in ascending order (null values are ordered last).
       * - `{field}:desc` - Uses the field in descending order (null values are ordered last).
       * - `{field}:desc:nullsAuto` - Uses the field in descending order (null values are ordered last).
       * - `{field}:desc:nullsFirst` - Uses the field in descending order (null values are ordered first).
       * - `{field}:desc:nullsLast` - Uses the field in descending order (null values are ordered last).
       *
       * When no sorting order is provided:
       *
       * - Uses `createdAt` field in descending order if the field exists.
       * - Falls back to sorting by `id` in descending order if `createdAt` is not available
       *
       * @default undefined
       */
      orderBy:
        | OrderBy<TFieldNames>
        | `${TFieldNames | 'id'}`
        | `${TFieldNames | 'id'}:asc`
        | `${TFieldNames | 'id'}:desc`
        | (
            | OrderBy<TFieldNames>
            | `${TFieldNames | 'id'}`
            | `${TFieldNames | 'id'}:asc`
            | `${TFieldNames | 'id'}:desc`
          )[]
        | undefined

      /**
       * The number of items to display per page.
       *
       * @default 50
       */
      perPage: number
    }
  }

  /**
   * Settings that define the form layout when creating new collection records.
   *
   * @default
   * {
   *   dashboardLayout: 'auto', // Automatic layout selection based on routing support
   *   fieldsLayout: undefined, // Display all fields in the order they are defined
   * }
   */
  createPage: {
    /**
     * The dashboard layout used when creating a new collection record.
     *
     * When set to 'auto', the layout is determined based on routing support:
     *
     * - With `routing`: Uses 'live-preview' layout
     * - Without `routing`: Uses 'standard' layout
     *
     * Available options:
     *
     * - `'auto'` - Automatic layout selection based on routing support.
     * - `'standard'` - Standard dashboard layout with header and sidebar (`PruviousDashboardPage.vue`).
     * - `'live-preview'` - Split view with live preview (`PruviousDashboardLivePreview.vue`).
     * - `resolvePruviousComponent('>/components/MyComponent.vue')` - Custom Vue component.
     *   - The component must be resolved using `resolvePruviousComponent()` or `resolveNamedPruviousComponent()`.
     *   - The import path must be a literal string, not a variable.
     *   - The import path can be an absolute or relative to the definition file.
     *
     * The custom component receives the following props:
     *
     * - @todo
     *
     * The custom component can emit the following events:
     *
     * - @todo
     *
     * @default 'auto'
     */
    dashboardLayout: 'auto' | 'standard' | 'live-preview' | (string & {})

    /**
     * Customizes the layout of the collection's fields in the dashboard.
     *
     * If not specified, the fields are stacked vertically in the order they are defined.
     *
     * Provide `mirror` to use the same layout as in the `updatePage` settings.
     *
     * @default undefined
     *
     * @example
     * ```ts
     * [
     *   // Single field
     *   'email',
     *
     *   // Half-width field (max-width: 50%)
     *   'firstName | 50%',
     *
     *   // Auto-width field { width: 'auto', flexShrink: 0 }
     *   'middleName | auto',
     *
     *   // Field with custom component styles
     *   {
     *     field: {
     *       name: 'lastName',
     *       style: { maxWidth: '50%' },
     *     },
     *   },
     *
     *   // Field group (row)
     *   {
     *     row: [
     *       // Has maximum width of 8rem
     *       'countryCode | 8rem',
     *
     *       // Takes up the remaining space
     *       'phone',
     *     ],
     *   },
     *
     *   // Horizontal rule
     *   '---',
     *
     *   // Field group (tabs)
     *   {
     *     tabs: [
     *       {
     *         label: ({ __ }) => __('pruvious-dashboard', 'Address'),
     *         fields: ['street | 40%', 'city | 40%', 'zipCode'],
     *       },
     *       {
     *         label: ({ __ }) => __('pruvious-dashboard', 'Contact'),
     *         fields: [
     *           {
     *             // Custom Vue component
     *             // - The component must be resolved using `resolvePruviousComponent()`
     *             //   or `resolveNamedPruviousComponent()`.
     *             // - The import path must be a literal string, not a variable.
     *             // - The import path can be an absolute or relative to the definition file.
     *             component: resolvePruviousComponent('>/components/Dashboard/ContactForm.vue'),
     *           },
     *         ],
     *       },
     *     ],
     *   },
     *
     *   // Card group
     *   {
     *     card: ['comments', 'assignedTo'],
     *   },
     * ]
     * ```
     */
    fieldsLayout: FieldsLayout<TFieldNames> | 'mirror' | undefined
  }

  /**
   * Settings that control how existing records are displayed and edited in the dashboard.
   *
   * @default
   * {
   *   dashboardLayout: 'auto', // Automatic layout selection based on routing support
   *   fieldsLayout: undefined, // Display all fields in the order they are defined
   * }
   */
  updatePage: {
    /**
     * The dashboard layout used when editing a collection record.
     *
     * When set to 'auto', the layout is determined based on routing support:
     *
     * - With `routing`: Uses 'live-preview' layout
     * - Without `routing`: Uses 'standard' layout
     *
     * Available options:
     *
     * - `'auto'` - Automatic layout selection based on routing support.
     * - `'standard'` - Standard dashboard layout with header and sidebar (`PruviousDashboardPage.vue`).
     * - `'live-preview'` - Split view with live preview (`PruviousDashboardLivePreview.vue`).
     * - `resolvePruviousComponent('>/components/MyComponent.vue')` - Custom Vue component.
     *   - The component must be resolved using `resolvePruviousComponent()` or `resolveNamedPruviousComponent()`.
     *   - The import path must be a literal string, not a variable.
     *   - The import path can be an absolute or relative to the definition file.
     *
     * The custom component receives the following props:
     *
     * - @todo
     *
     * The custom component can emit the following events:
     *
     * - @todo
     *
     * @default 'auto'
     */
    dashboardLayout: 'auto' | 'standard' | 'live-preview' | (string & {})

    /**
     * Customizes the layout of the collection's fields in the dashboard.
     *
     * If not specified, the fields are stacked vertically in the order they are defined.
     *
     * Provide `mirror` to use the same layout as in the `createPage` settings.
     *
     * @default undefined
     *
     * @example
     * ```ts
     * [
     *   // Single field
     *   'email',
     *
     *   // Half-width field (max-width: 50%)
     *   'firstName | 50%',
     *
     *   // Auto-width field { width: 'auto', flexShrink: 0 }
     *   'middleName | auto',
     *
     *   // Field with custom component styles
     *   {
     *     field: {
     *       name: 'lastName',
     *       style: { maxWidth: '50%' },
     *     },
     *   },
     *
     *   // Field group (row)
     *   {
     *     row: [
     *       // Has maximum width of 8rem
     *       'countryCode | 8rem',
     *
     *       // Takes up the remaining space
     *       'phone',
     *     ],
     *   },
     *
     *   // Horizontal rule
     *   '---',
     *
     *   // Field group (tabs)
     *   {
     *     tabs: [
     *       {
     *         label: ({ __ }) => __('pruvious-dashboard', 'Address'),
     *         fields: ['street | 40%', 'city | 40%', 'zipCode'],
     *       },
     *       {
     *         label: ({ __ }) => __('pruvious-dashboard', 'Contact'),
     *         fields: [
     *           {
     *             // Custom Vue component
     *             // - The component must be resolved using `resolvePruviousComponent()`
     *             //   or `resolveNamedPruviousComponent()`.
     *             // - The import path must be a literal string, not a variable.
     *             // - The import path can be an absolute or relative to the definition file.
     *             component: resolvePruviousComponent('>/components/Dashboard/ContactForm.vue'),
     *           },
     *         ],
     *       },
     *     ],
     *   },
     *
     *   // Card group
     *   {
     *     card: ['comments', 'assignedTo'],
     *   },
     * ]
     * ```
     */
    fieldsLayout: FieldsLayout<TFieldNames> | 'mirror' | undefined
  }
}

interface AutoFieldEnabled {
  /**
   * Specifies whether this collection has the field activated.
   */
  enabled: boolean
}

export interface BaseCreatedAtFieldOptions {
  /**
   * Controls whether to create a database index for this field.
   *
   * @default true
   */
  index?: boolean
}

export interface BaseUpdatedAtFieldOptions {
  /**
   * Controls whether to create a database index for this field.
   *
   * @default false
   */
  index?: boolean
}

export interface BaseAuthorFieldOptions {
  /**
   * Controls whether to create a database index for this field.
   *
   * @default true
   */
  index?: boolean

  /**
   * Controls if a foreign key constraint should be added to this field.
   *
   * Accept boolean or string values:
   *
   * - `true` - Creates a foreign key constraint on the `id` field of the `Users` collection.
   * - `false` - No foreign key constraint will be created.
   * - `string` - Name of the collection to reference.
   *
   * The referenced field is always the `id` field of the target collection.
   *
   * @default true
   */
  foreignKey?: boolean | string
}

export interface BaseEditorsFieldOptions {
  /**
   * Controls whether to create a database index for this field.
   *
   * @default false
   */
  index?: boolean
}

export interface BaseSubpathFieldOptions {
  /**
   * Controls whether to create a unique database index for this field.
   * If the collection is `translatable`, a multi-column index is created for the `subpath` and `language` fields.
   *
   * @default true
   */
  index?: boolean
}

export interface BaseIsPublicFieldOptions {
  /**
   * Controls whether to create a database index for this field.
   *
   * @default true
   */
  index?: boolean
}

export type PublicRoutingFieldNames<
  TFields extends Record<string, GenericField>,
  TTranslatable extends boolean | undefined,
  TCreatedAt extends boolean | (CreatedAtFieldPresetOptions & BaseCreatedAtFieldOptions) | undefined,
  TUpdatedAt extends boolean | (UpdatedAtFieldPresetOptions & BaseUpdatedAtFieldOptions) | undefined,
  TAuthor extends boolean | (AuthorFieldPresetOptions & BaseAuthorFieldOptions) | undefined,
  TEditors extends boolean | (EditorsFieldPresetOptions & BaseEditorsFieldOptions) | undefined,
  TIsPublic extends boolean | (IsPublicFieldPresetOptions & BaseIsPublicFieldOptions) | undefined,
  TScheduledAt extends boolean | ScheduledAtFieldPresetOptions | undefined,
  TSEO extends boolean | SEOFieldPresetOptions | undefined,
> =
  | 'id'
  | (keyof TFields & string)
  | (DefaultTrue<TTranslatable> extends true ? 'translations' | 'language' : never)
  | (DefaultTrue<TCreatedAt> extends false ? never : 'createdAt')
  | (DefaultTrue<TUpdatedAt> extends false ? never : 'updatedAt')
  | (DefaultFalseWithOptions<TAuthor> extends false ? never : 'author')
  | (DefaultFalseWithOptions<TEditors> extends false ? never : 'editors')
  | 'subpath'
  | (DefaultFalseWithOptions<TIsPublic> extends false ? never : 'isPublic')
  | (DefaultFalseWithOptions<TScheduledAt> extends false ? never : 'scheduledAt')
  | (DefaultFalseWithOptions<TSEO> extends false ? never : 'seo')

export type CollectionRoutingOptions<
  TFieldNames extends string,
  TIsPublic extends boolean | (IsPublicFieldPresetOptions & BaseIsPublicFieldOptions) | undefined,
  TScheduledAt extends boolean | ScheduledAtFieldPresetOptions | undefined,
  TSEO extends boolean | SEOFieldPresetOptions | undefined,
> = {
  /**
   * Specifies which fields will be exposed in the `$data` property of a route record.
   *
   * If not provided, all custom `fields` plus `id`, `createdAt`, and `updatedAt` (when available) will be included by default.
   */
  publicFields?: TFieldNames[]

  /**
   * Specifies the `subpath` field options for the collection.
   *
   * This field generates unique URLs for each record in the collection.
   * It should be a string or numeric field that uniquely identifies each record (like a slug or ID).
   * The value will be used as the last part of the URL path.
   * The beginning of the URL path comes from the collection's route `path`.
   *
   * @default
   * {
   *   index: true,
   *   ui: {
   *     label: ({ __ }) => __('pruvious-dashboard', 'Subpath'),
   *     description: ({ __ }) => __('pruvious-dashboard', 'The last part of the URL path after the base URL.'),
   *     placeholder: ({ __ }) => __('pruvious-dashboard', 'unique-subpath'),
   *   },
   * }
   */
  subpath?: SubpathFieldPresetOptions

  /**
   * Controls if the collection includes a `isPublic` boolean field.
   * When enabled, it determines if a collection record is publicly accessible via its route.
   * When disabled, the route is always accessible if it has a `subpath` value.
   *
   * Available options:
   *
   * - `true` - Enables the field with default options.
   * - `{...}` - Configures custom options for the field.
   * - `false` - Disables the field completely.
   *
   * @default
   * {
   *   index: true,
   *   conditionalLogic: { subpath: { '!=': null } },
   *   ui: {
   *     label: ({ __ }) => __('pruvious-dashboard', 'Status'),
   *     description: ({ __ }) => __('pruvious-dashboard', 'Indicates whether this route is publicly accessible.'),
   *     noLabel: ({ __ }) => __('pruvious-dashboard', 'Draft'),
   *     yesLabel: ({ __ }) => __('pruvious-dashboard', 'Public'),
   *   },
   * }
   *
   * @default false
   */
  isPublic?: TIsPublic

  /**
   * Controls if the collection includes a `scheduledAt` boolean field.
   * When enabled with `isPublic` set to `true`, allows content to be published automatically at a specified date and time.
   * When `isPublic` is `false`, this field has no special behavior and can be used like any standard date-time field.
   *
   * Available options:
   *
   * - `true` - Enables the field with default options.
   * - `{...}` - Configures custom options for the field.
   * - `false` - Disables the field completely.
   *
   * @default
   * {
   *   conditionalLogic: { subpath: { '!=': null } },
   *   ui: {
   *     label: ({ __ }) => __('pruvious-dashboard', 'Publish date'),
   *     description: ({ __ }) => __('pruvious-dashboard', 'Sets when this content will be published. Use current date and time for immediate publication or a future date to schedule it.'),
   *   },
   * }
   *
   * @default false
   */
  scheduledAt?: TScheduledAt

  /**
   * Controls if the collection includes a `seo` field.
   * When enabled, it allows setting SEO metadata for the collection record.
   *
   * Available options:
   *
   * - `true` - Enables the field with default options.
   * - `{...}` - Configures custom options for the field.
   * - `false` - Disables the field completely.
   *
   * @default false
   */
  seo?: TSEO

  /**
   * The layout key used to render the collection's route.
   * Defines which Vue component will be used in `<NuxtLayout>` when displaying this collection.
   *
   * @example
   *
   * If you have a layout in `app/layouts/page.vue`, set this to `page` and use it like:
   *
   * ```vue
   * <template>
   *   <NuxtLayout :name="route?.layout">
   *     <Header />
   *     <PruviousBlocks field="blocks" />
   *     <Footer />
   *     <PruviousWidgets />
   *   </NuxtLayout>
   * </template>
   *
   * <script setup>
   * import { usePruviousRoute } from '#pruvious/client'
   *
   * definePageMeta({
   *   middleware: ['pruvious'],
   * })
   *
   * const route = usePruviousRoute()
   * </script>
   * ```
   *
   * @default undefined
   */
  layout?: LayoutKey
}

interface ResolveContext {
  /**
   * The name of the collection being resolved.
   */
  collectionName: string

  /**
   * The `ResolveFromLayersResult` object containing the file location.
   */
  location: ResolveFromLayersResultContextBinding
}

interface CollectionRoutingMeta {
  enabled: boolean
  publicFields: string[]
  subpath: SubpathFieldPresetOptions & Required<BaseSubpathFieldOptions>
  isPublic: AutoFieldEnabled & IsPublicFieldPresetOptions & Required<BaseIsPublicFieldOptions>
  scheduledAt: AutoFieldEnabled & ScheduledAtFieldPresetOptions
  seo: AutoFieldEnabled & SEOFieldPresetOptions
  layout?: LayoutKey
}

export type CollectionMeta = DeepRequired<
  Pick<
    CollectionMetaOptions<
      any,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    >,
    'api'
  >
> &
  Required<
    Pick<
      CollectionMetaOptions<
        any,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      >,
      'translatable' | 'syncedFields' | 'guards' | 'authGuard' | 'copyTranslation' | 'duplicate'
    >
  > & {
    api: { create: boolean; read: boolean; update: boolean; delete: boolean }
    authGuard: ('create' | 'read' | 'update' | 'delete')[]
    logs: {
      enabled: boolean
      exposeData: boolean
      operations: { insert: boolean; select: boolean; update: boolean; delete: boolean }
    }
    createdAt: AutoFieldEnabled & CreatedAtFieldPresetOptions & Required<BaseCreatedAtFieldOptions>
    updatedAt: AutoFieldEnabled & UpdatedAtFieldPresetOptions & Required<BaseUpdatedAtFieldOptions>
    author: AutoFieldEnabled & AuthorFieldPresetOptions & Required<BaseAuthorFieldOptions>
    editors: AutoFieldEnabled & EditorsFieldPresetOptions & Required<BaseEditorsFieldOptions>
    routing: CollectionRoutingMeta
    ui: CollectionUIOptions
  }
export type GenericMetaCollection = Collection<Record<string, GenericField>, CollectionMeta>
export type MetaContext = Context<Database<Record<string, GenericMetaCollection>>>

export type MergeCollectionFields<
  TFields extends Record<string, GenericField>,
  TTranslatable extends boolean | undefined,
  TCreatedAt extends boolean | (CreatedAtFieldPresetOptions & BaseCreatedAtFieldOptions) | undefined,
  TUpdatedAt extends boolean | (UpdatedAtFieldPresetOptions & BaseUpdatedAtFieldOptions) | undefined,
  TAuthor extends boolean | (AuthorFieldPresetOptions & BaseAuthorFieldOptions) | undefined,
  TEditors extends boolean | (EditorsFieldPresetOptions & BaseEditorsFieldOptions) | undefined,
  TIsPublic extends boolean | (IsPublicFieldPresetOptions & BaseIsPublicFieldOptions) | undefined,
  TScheduledAt extends boolean | ScheduledAtFieldPresetOptions | undefined,
  TSEO extends boolean | SEOFieldPresetOptions | undefined,
  TRouting extends
    | boolean
    | CollectionRoutingOptions<
        PublicRoutingFieldNames<
          TFields,
          TTranslatable,
          TCreatedAt,
          TUpdatedAt,
          TAuthor,
          TEditors,
          TIsPublic,
          TScheduledAt,
          TSEO
        >,
        TIsPublic,
        TScheduledAt,
        TSEO
      >
    | undefined,
> = TFields &
  (DefaultTrue<TTranslatable> extends true
    ? { translations: ReturnType<typeof translationsFieldPreset>; language: ReturnType<typeof languageFieldPreset> }
    : {}) &
  (DefaultTrue<TCreatedAt> extends false ? {} : { createdAt: ReturnType<typeof createdAtFieldPreset> }) &
  (DefaultTrue<TUpdatedAt> extends false ? {} : { updatedAt: ReturnType<typeof updatedAtFieldPreset> }) &
  (DefaultFalseWithOptions<TAuthor> extends false ? {} : { author: ReturnType<typeof authorFieldPreset> }) &
  (DefaultFalseWithOptions<TEditors> extends false ? {} : { editors: ReturnType<typeof editorsFieldPreset> }) &
  (DefaultFalseWithOptions<TRouting> extends false ? {} : { subpath: ReturnType<typeof subpathFieldPreset> }) &
  (DefaultFalseWithOptions<TIsPublic> extends false ? {} : { isPublic: ReturnType<typeof subpathFieldPreset> }) &
  (DefaultFalseWithOptions<TScheduledAt> extends false ? {} : { scheduledAt: ReturnType<typeof subpathFieldPreset> }) &
  (DefaultFalseWithOptions<TSEO> extends false ? {} : { seo: ReturnType<typeof seoFieldPreset> })

/**
 * Creates a new Pruvious collection.
 *
 * Use this as the default export in a file within the `server/collections/` directory.
 * The filename determines the collection name, which should be in PascalCase (e.g. 'Products.ts', 'ProductCategories.ts', etc.).
 *
 * @see https://pruvious.com/docs/collections
 *
 * @example
 * ```ts
 * // server/collections/Products.ts
 * import { defineCollection } from '#pruvious/server'
 *
 * export default defineCollection({
 *   fields: {
 *     // @todo
 *     // ...
 *   },
 *   foreignKeys: [
 *     // @todo
 *   ],
 *   // @todo dashboard and API options
 * })
 * ```
 */
export function defineCollection<
  const TFields extends Record<string, GenericField>,
  const TTranslatable extends boolean | undefined,
  const TCreatedAt extends boolean | (CreatedAtFieldPresetOptions & BaseCreatedAtFieldOptions) | undefined,
  const TUpdatedAt extends boolean | (UpdatedAtFieldPresetOptions & BaseUpdatedAtFieldOptions) | undefined,
  const TAuthor extends boolean | (AuthorFieldPresetOptions & BaseAuthorFieldOptions) | undefined,
  const TEditors extends boolean | (EditorsFieldPresetOptions & BaseEditorsFieldOptions) | undefined,
  const TIsPublic extends boolean | (IsPublicFieldPresetOptions & BaseIsPublicFieldOptions) | undefined,
  const TScheduledAt extends boolean | ScheduledAtFieldPresetOptions | undefined,
  const TSEO extends boolean | SEOFieldPresetOptions | undefined,
  const TRouting extends
    | boolean
    | CollectionRoutingOptions<
        PublicRoutingFieldNames<
          TFields,
          TTranslatable,
          TCreatedAt,
          TUpdatedAt,
          TAuthor,
          TEditors,
          TIsPublic,
          TScheduledAt,
          TSEO
        >,
        TIsPublic,
        TScheduledAt,
        TSEO
      >
    | undefined,
>(
  options: DefineCollectionOptions<
    TFields,
    TTranslatable,
    TCreatedAt,
    TUpdatedAt,
    TAuthor,
    TEditors,
    TIsPublic,
    TScheduledAt,
    TSEO,
    TRouting
  >,
): (
  resolveContext: ResolveContext,
) => Collection<
  MergeCollectionFields<
    TFields,
    TTranslatable,
    TCreatedAt,
    TUpdatedAt,
    TAuthor,
    TEditors,
    TIsPublic,
    TScheduledAt,
    TSEO,
    TRouting
  >,
  CollectionMeta
> {
  return function (resolveContext: ResolveContext) {
    let fields: Record<string, GenericField> = { ...options.fields }
    const hooks: Required<CollectionHooks> = {
      beforeQueryPreparation: options.hooks?.beforeQueryPreparation ?? [],
      beforeQueryExecution: options.hooks?.beforeQueryExecution ?? [],
      afterQueryExecution: options.hooks?.afterQueryExecution ?? [],
    }
    const translatable = options.translatable ?? true
    const syncedFields = options.syncedFields ?? []
    const createdAt: AutoFieldEnabled & CreatedAtFieldPresetOptions & Required<BaseCreatedAtFieldOptions> = defu(
      { enabled: options.createdAt !== false },
      isObject(options.createdAt) ? options.createdAt : {},
      { index: true },
    )
    const updatedAt: AutoFieldEnabled & UpdatedAtFieldPresetOptions & Required<BaseUpdatedAtFieldOptions> = defu(
      { enabled: options.updatedAt !== false },
      isObject(options.updatedAt) ? options.updatedAt : {},
      { index: false },
    )
    const author: AutoFieldEnabled & AuthorFieldPresetOptions & Required<BaseAuthorFieldOptions> = defu(
      { enabled: !!options.author },
      isObject(options.author) ? options.author : {},
      { index: true, foreignKey: true },
    )
    const editors: AutoFieldEnabled & EditorsFieldPresetOptions & Required<BaseEditorsFieldOptions> = defu(
      { enabled: !!options.editors },
      isObject(options.editors) ? options.editors : {},
      { index: false },
    )
    const routing: CollectionRoutingMeta = defu(
      { enabled: !!options.routing },
      isObject(options.routing)
        ? {
            ...(options.routing as unknown as CollectionRoutingMeta),
            isPublic: isObject(options.routing.isPublic) ? options.routing.isPublic : {},
            scheduledAt: isObject(options.routing.scheduledAt) ? options.routing.scheduledAt : {},
            seo: isObject(options.routing.seo) ? options.routing.seo : {},
            layout: options.routing.layout,
          }
        : {},
      {
        publicFields: [
          'id',
          ...Object.keys(options.fields),
          ...(createdAt.enabled ? ['createdAt'] : []),
          ...(updatedAt.enabled ? ['updatedAt'] : []),
        ],
        subpath: { index: true },
        isPublic: {
          enabled: isObject(options.routing) && !!options.routing.isPublic,
          index: true,
          conditionalLogic: { subpath: { '!=': null } },
        },
        scheduledAt: {
          enabled: isObject(options.routing) && !!options.routing.scheduledAt,
          conditionalLogic: { subpath: { '!=': null } },
        },
        seo: {
          enabled: isObject(options.routing) && !!options.routing.seo,
          subfields: {},
          conditionalLogic: { subpath: { '!=': null } },
        },
      },
    )
    const ui = deepClone(options.ui)
    const indexes = [...(options.indexes ?? [])]
    const foreignKeys = [...(options.foreignKeys ?? [])]

    for (const fieldName of Object.keys(fields)) {
      if (fieldName === 'id') {
        warnWithContext(`The field name ${colorize('yellow', fieldName)} is reserved.`, [
          `The primary key field is automatically created for all collections.`,
          `Source: ${colorize('dim', resolveContext.location.file.relative)}`,
        ])
        delete fields[fieldName]
      } else if (translatable && fieldName === 'translations') {
        warnWithContext(`The field name ${colorize('yellow', fieldName)} is reserved.`, [
          `This field is automatically generated by the collection.`,
          `You can disable this behavior by setting the \`translatable\` option to \`false\` in your collection definition.`,
          `Source: ${colorize('dim', resolveContext.location.file.relative)}`,
        ])
      } else if (translatable && fieldName === 'language') {
        warnWithContext(`The field name ${colorize('yellow', fieldName)} is reserved.`, [
          `This field is automatically generated by the collection.`,
          `You can disable this behavior by setting the \`translatable\` option to \`false\` in your collection definition.`,
          `Source: ${colorize('dim', resolveContext.location.file.relative)}`,
        ])
      } else if (createdAt.enabled && fieldName === 'createdAt') {
        warnWithContext(`The field name ${colorize('yellow', fieldName)} is reserved.`, [
          `This field is automatically generated by the collection.`,
          `You can disable this behavior by setting the \`createdAt\` option to \`false\` in your collection definition.`,
          `Source: ${colorize('dim', resolveContext.location.file.relative)}`,
        ])
        delete fields[fieldName]
      } else if (updatedAt.enabled && fieldName === 'updatedAt') {
        warnWithContext(`The field name ${colorize('yellow', fieldName)} is reserved.`, [
          `This field is automatically generated by the collection.`,
          `You can disable this behavior by setting the \`updatedAt\` option to \`false\` in your collection definition.`,
          `Source: ${colorize('dim', resolveContext.location.file.relative)}`,
        ])
        delete fields[fieldName]
      } else if (author.enabled && fieldName === 'author') {
        warnWithContext(`The field name ${colorize('yellow', fieldName)} is reserved.`, [
          `This field is automatically generated by the collection.`,
          `You can disable this behavior by setting the \`author\` option to \`false\` in your collection definition.`,
          `Source: ${colorize('dim', resolveContext.location.file.relative)}`,
        ])
      } else if (editors.enabled && fieldName === 'editors') {
        warnWithContext(`The field name ${colorize('yellow', fieldName)} is reserved.`, [
          `This field is automatically generated by the collection.`,
          `You can disable this behavior by setting the \`editors\` option to \`false\` in your collection definition.`,
          `Source: ${colorize('dim', resolveContext.location.file.relative)}`,
        ])
      } else if (routing.enabled && fieldName === 'subpath') {
        warnWithContext(`The field name ${colorize('yellow', fieldName)} is reserved.`, [
          `This field is automatically generated by the collection.`,
          `You can disable this behavior by setting the \`routing\` option to \`false\` in your collection definition.`,
          `Source: ${colorize('dim', resolveContext.location.file.relative)}`,
        ])
      } else if (routing.isPublic.enabled && fieldName === 'isPublic') {
        warnWithContext(`The field name ${colorize('yellow', fieldName)} is reserved.`, [
          `This field is automatically generated by the collection.`,
          `You can disable this behavior by setting the \`routing.isPublic\` option to \`false\` in your collection definition.`,
          `Source: ${colorize('dim', resolveContext.location.file.relative)}`,
        ])
      } else if (routing.scheduledAt.enabled && fieldName === 'scheduledAt') {
        warnWithContext(`The field name ${colorize('yellow', fieldName)} is reserved.`, [
          `This field is automatically generated by the collection.`,
          `You can disable this behavior by setting the \`routing.scheduledAt\` option to \`false\` in your collection definition.`,
          `Source: ${colorize('dim', resolveContext.location.file.relative)}`,
        ])
      } else if (routing.seo.enabled && fieldName === 'seo') {
        warnWithContext(`The field name ${colorize('yellow', fieldName)} is reserved.`, [
          `This field is automatically generated by the collection.`,
          `You can disable this behavior by setting the \`routing.seo\` option to \`false\` in your collection definition.`,
          `Source: ${colorize('dim', resolveContext.location.file.relative)}`,
        ])
        // @todo check for other reserved field names (deletedAt, ...)
      } else if (camelCase(fieldName) !== fieldName || fieldName.length > 63) {
        warnWithContext(`The field name ${colorize('yellow', fieldName)} is invalid.`, [
          `Field names must be in camelCase format and maximum 63 characters long.`,
          `Suggested name: ${colorize('greenBright', camelCase(fieldName).slice(0, 63) || 'fieldName')}`,
          `Source: ${colorize('dim', resolveContext.location.file.relative)}`,
        ])
        delete fields[fieldName]
      }
    }

    if (createdAt.enabled) {
      fields.createdAt = createdAtFieldPreset(omit(createdAt, ['enabled', 'index']))
      if (createdAt.index) {
        indexes.push({ fields: ['createdAt'] })
      }
    }

    if (updatedAt.enabled) {
      fields.updatedAt = updatedAtFieldPreset(omit(updatedAt, ['enabled', 'index']))
      if (updatedAt.index) {
        indexes.push({ fields: ['updatedAt'] })
      }
    }

    if (author.enabled) {
      fields.author = authorFieldPreset(omit(author, ['enabled', 'index', 'foreignKey']))
      if (author.index) {
        indexes.push({ fields: ['author'] })
      }
      if (author.foreignKey) {
        foreignKeys.push({
          field: 'author',
          referencedCollection: isString(author.foreignKey) ? author.foreignKey : 'Users',
        })
      }
    }

    if (editors.enabled) {
      fields.editors = editorsFieldPreset(omit(editors, ['enabled', 'index']))
      if (editors.index) {
        indexes.push({ fields: ['editors'] })
      }
    }

    if (routing.enabled) {
      const routingFields: Record<string, GenericField> = {
        subpath: subpathFieldPreset(omit(routing.subpath, ['index']) as any),
      }
      if (routing.subpath?.index) {
        indexes.push({ fields: translatable ? ['subpath', 'language'] : ['subpath'], unique: true })
      }

      if (routing.isPublic.enabled) {
        routingFields.isPublic = isPublicFieldPreset(omit(routing.isPublic, ['enabled', 'index']) as any)
        if (routing.isPublic.index) {
          indexes.push({ fields: ['isPublic'] })
        }
      }

      if (routing.scheduledAt.enabled) {
        routingFields.scheduledAt = scheduledAtFieldPreset(omit(routing.scheduledAt, ['enabled']) as any)
      }

      if (routing.seo.enabled) {
        routingFields.seo = seoFieldPreset(omit(routing.seo, ['enabled']) as any)
      }

      fields = { ...routingFields, ...fields }
    }

    if (translatable) {
      fields.translations = translationsFieldPreset({})
      fields.language = languageFieldPreset({})
      indexes.push(
        { fields: ['language'] },
        { fields: ['translations'] },
        { fields: ['translations', 'language'], unique: true },
      )

      if (syncedFields.length) {
        hooks.afterQueryExecution.push(async (context, { result }) => {
          if (
            !context.customData._syncingFields &&
            context.operation === 'update' &&
            result.success &&
            syncedFields.some((syncedField: any) => isDefined(context.sanitizedInput[syncedField])) &&
            (isPositiveInteger(result.data) || (isArray(result.data) && result.data.length))
          ) {
            const translationKeys: string[] = []
            const firstResult = isArray(result.data) ? (result.data[0] as Record<string, any>) : {}
            if (isString(firstResult.translations)) {
              translationKeys.push(...(result.data as Record<string, any>[]).map(({ translations }) => translations))
            } else {
              const updatedRecords = await context.database
                .queryBuilder()
                .selectFrom(context.collectionName!)
                .select('translations')
                .setWhereCondition(context.whereCondition)
                .useCache(context.cache)
                .all()
              if (updatedRecords.success) {
                translationKeys.push(...updatedRecords.data.map(({ translations }) => translations))
              }
            }
            const filteredTranslationKeys = translationKeys.filter(Boolean)
            if (filteredTranslationKeys.length) {
              const fieldsToSync = syncedFields.filter((syncedField: any) =>
                isDefined(context.sanitizedInput[syncedField]),
              )
              await context.database
                .queryBuilder()
                .update(context.collectionName!)
                .set(
                  Object.fromEntries(
                    fieldsToSync.map((syncedField: any) => [syncedField, context.sanitizedInput[syncedField]]),
                  ),
                )
                .where('translations', 'in', filteredTranslationKeys)
                .withCustomContextData({ _syncingFields: true })
                .run()
            }
          }
        })
      }
    }

    if (author.enabled || editors.enabled) {
      hooks.beforeQueryPreparation.push(({ collectionName, operation, queryBuilder, customData }) => {
        if (!customData._guarded) {
          return
        }

        if (operation !== 'insert') {
          const event = useEvent()
          if (!event.context.pruvious.auth.isLoggedIn) {
            setResponseStatus(event, 401, httpStatusCodeMessages[401])
            throw new Error(
              isDevelopment ? 'You must be logged in to access this resource' : httpStatusCodeMessages[401],
            )
          }
          const slug = kebabCase(collectionName!)
          const permission = `collection:${slug}:manage` as Permission
          if (!event.context.pruvious.auth.permissions.includes(permission)) {
            const userId = event.context.pruvious.auth.user.id
            if (operation === 'select') {
              if (author.enabled && author.strict && editors.enabled && editors.strict) {
                queryBuilder!.orGroup([
                  (eb) => eb.where('author', '=', userId),
                  (eb) => eb.where('editors', 'includes', userId),
                ])
              } else if (author.enabled && author.strict) {
                queryBuilder!.where('author', '=', userId)
              } else if (editors.enabled && editors.strict) {
                queryBuilder!.where('editors', 'includes', userId)
              }
            } else if (operation === 'update') {
              if (author.enabled && editors.enabled) {
                queryBuilder!.orGroup([
                  (eb) => eb.where('author', '=', userId),
                  (eb) => eb.where('editors', 'includes', userId),
                ])
              } else if (author.enabled) {
                queryBuilder!.where('author', '=', userId)
              } else if (editors.enabled) {
                queryBuilder!.where('editors', 'includes', userId)
              }
            } else if (operation === 'delete') {
              if (author.enabled) {
                queryBuilder!.where('author', '=', userId)
              } else {
                queryBuilder!.where('id', '=', 0)
              }
            }
          }
        }
      })
    }

    if (isString(ui?.indexPage?.dashboardLayout) && ui.indexPage.dashboardLayout !== 'standard') {
      ui.indexPage.dashboardLayout = ui.indexPage.dashboardLayout.includes('/')
        ? hash(
            resolveCustomComponentPath({
              component: ui.indexPage.dashboardLayout,
              file: resolveContext.location.file.absolute,
              srcDir: resolveContext.location.srcDir,
            }),
          )
        : ui.indexPage.dashboardLayout
    }

    if (isArray(ui?.indexPage?.table?.columns)) {
      for (const column of ui.indexPage.table.columns) {
        if (isObject(column)) {
          column.minWidth ??= '16rem'
          if ('component' in column) {
            column.component = column.component.includes('/')
              ? hash(
                  resolveCustomComponentPath({
                    component: column.component,
                    file: resolveContext.location.file.absolute,
                    srcDir: resolveContext.location.srcDir,
                  }),
                )
              : column.component
          }
        }
      }
    }

    for (const page of ['createPage', 'updatePage'] as const) {
      if (
        isString(ui?.[page]?.dashboardLayout) &&
        !['auto', 'standard', 'live-preview'].includes(ui[page].dashboardLayout)
      ) {
        ui[page].dashboardLayout = ui[page].dashboardLayout.includes('/')
          ? hash(
              resolveCustomComponentPath({
                component: ui[page].dashboardLayout,
                file: resolveContext.location.file.absolute,
                srcDir: resolveContext.location.srcDir,
              }),
            )
          : ui[page].dashboardLayout
      }

      if (isArray(ui?.[page]?.fieldsLayout)) {
        for (const { item, path } of walkFieldLayoutItems(ui[page].fieldsLayout)) {
          if (isObject(item) && 'component' in item) {
            setProperty(
              ui[page].fieldsLayout,
              `${path}.component`,
              item.component.includes('/')
                ? hash(
                    resolveCustomComponentPath({
                      component: item.component,
                      file: resolveContext.location.file.absolute,
                      srcDir: resolveContext.location.srcDir,
                    }),
                  )
                : item.component,
            )
          }
        }
      }
    }

    return new Collection({
      key: options.key,
      fields: fields as any,
      indexes,
      foreignKeys,
      hooks,
      meta: {
        translatable: (options.translatable ?? true) as never,
        syncedFields,
        api: defu(
          isUndefined(options.api) || options.api === true
            ? {}
            : options.api === false
              ? { create: false, read: false, update: false, delete: false }
              : options.api,
          { create: true, read: true, update: true, delete: true },
        ),
        guards: [collectionPermissionGuard, ...(options.guards ?? [])],
        authGuard:
          isUndefined(options.authGuard) || options.authGuard === true
            ? ['create', 'read', 'update', 'delete']
            : options.authGuard === false
              ? []
              : options.authGuard,
        copyTranslation: options.copyTranslation ?? null,
        duplicate: options.duplicate ?? null,
        logs: {
          enabled: options.logs !== false,
          exposeData: isObject(options.logs) ? !!options.logs.exposeData : false,
          operations: defu(isObject(options.logs) && isObject(options.logs.operations) ? options.logs.operations : {}, {
            insert: true,
            select: true,
            update: true,
            delete: true,
          }),
        },
        createdAt,
        updatedAt,
        author,
        editors,
        routing,
        ui: defu(ui ?? {}, {
          hidden: false,
          label: undefined,
          icon: 'folder',
          menu: { hidden: false, group: 'collections', order: 10 },
          indexPage: {
            dashboardLayout: 'standard',
            table: { columns: undefined, orderBy: undefined as any, perPage: 50 },
          },
          createPage: { dashboardLayout: 'auto', fieldsLayout: undefined },
          updatePage: { dashboardLayout: 'auto', fieldsLayout: undefined },
        } satisfies Required<CollectionUIOptions>),
      } satisfies CollectionMeta,
    }) as any
  }
}

/**
 * Creates a new Pruvious collection based on a predefined template.
 * This function receives two arguments:
 *
 * - `templateName` - The name of the collection template to use.
 * - `callback` - A function that receives the `template` object and returns the final collection options.
 *
 * Inside the `callback` function, you can freely modify any properties of the `template` object.
 *
 * @returns a `Promise` that resolves to the defined collection instance.
 *
 * @see https://pruvious.com/docs/collection-templates (@todo set up this link)
 *
 * @example
 * ```ts
 * // server/collections/Users.ts
 * import { defineCollectionFromTemplate, textField } from '#pruvious/server'
 *
 * export default defineCollectionFromTemplate('Users', (template) => ({
 *   ...template,
 *   fields: {
 *     ...template.fields,
 *     nickname: textField({}),
 *   },
 * }))
 * ```
 */
export async function defineCollectionFromTemplate<
  TTemplateName extends keyof Templates,
  const TFields extends Record<string, GenericField>,
  const TTranslatable extends boolean | undefined,
  const TCreatedAt extends boolean | (CreatedAtFieldPresetOptions & BaseEditorsFieldOptions) | undefined,
  const TUpdatedAt extends boolean | (UpdatedAtFieldPresetOptions & BaseEditorsFieldOptions) | undefined,
  const TAuthor extends boolean | (AuthorFieldPresetOptions & BaseEditorsFieldOptions) | undefined,
  const TEditors extends boolean | (EditorsFieldPresetOptions & BaseEditorsFieldOptions) | undefined,
  const TIsPublic extends boolean | (IsPublicFieldPresetOptions & BaseIsPublicFieldOptions) | undefined,
  const TScheduledAt extends boolean | ScheduledAtFieldPresetOptions | undefined,
  const TSEO extends boolean | SEOFieldPresetOptions | undefined,
  const TRouting extends
    | boolean
    | CollectionRoutingOptions<
        PublicRoutingFieldNames<
          TFields,
          TTranslatable,
          TCreatedAt,
          TUpdatedAt,
          TAuthor,
          TEditors,
          TIsPublic,
          TScheduledAt,
          TSEO
        >,
        TIsPublic,
        TScheduledAt,
        TSEO
      >
    | undefined,
>(
  templateName: TTemplateName,
  callback: (
    template: Templates[TTemplateName],
  ) => DefineCollectionOptions<
    TFields,
    TTranslatable,
    TCreatedAt,
    TUpdatedAt,
    TAuthor,
    TEditors,
    TIsPublic,
    TScheduledAt,
    TSEO,
    TRouting
  >,
): Promise<
  (
    resolveContext: ResolveContext,
  ) => Collection<
    MergeCollectionFields<
      TFields,
      TTranslatable,
      TCreatedAt,
      TUpdatedAt,
      TAuthor,
      TEditors,
      TIsPublic,
      TScheduledAt,
      TSEO,
      TRouting
    >,
    CollectionMeta
  >
> {
  const { getTemplate } = await import('#pruvious/server')
  const template = (await getTemplate(templateName)) as any

  return defineCollection(callback(template()))
}
