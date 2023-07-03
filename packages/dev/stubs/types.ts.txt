import { Icon } from './icons'

/*
|--------------------------------------------------------------------------
| Config
|--------------------------------------------------------------------------
|
*/

export interface Config {
  /**
   * An array of registered languages, where each language is defined by its code and label.
   *
   * Defaults to `[{ code: 'en', label: 'English' }]`.
   *
   * @example
   * ```js
   * [{ code: 'en', label: 'English' }, { code: 'de', label: 'Deutsch' }]
   * ```
   */
  languages?: {
    /**
     * A language code supported by the HTML `hreflang` attribute, typically in the ISO 639-1 format (e.g., "en" for English, "de" for German, "fr" for French, etc.).
     *
     * @see https://en.m.wikipedia.org/wiki/List_of_ISO_639-1_codes
     */
    code: string

    /**
     * The displayed label for the language (e.g "English", "Deutsch", "Français", etc.).
     */
    label: string
  }[]

  /**
   * The code for the default CMS language. It should match one of the language codes present in the `languages` array.
   *
   * Defaults to the first item of the `languages` array.
   */
  defaultLanguage?: string

  /**
   * Page related settings. Set to `false` to disable pages completely.
   *
   * Note: The settings provided here will be merged with the default settings.
   *
   * Defaults to:
   *
   * ```js
   * {
   *   fields: [],
   *   types: {
   *     default: {}
   *   },
   *   icon: 'note',
   *   labels: {
   *     title: { singular: 'Page', plural: 'Pages' },
   *     item: { singular: 'Page', plural: 'Pages' }
   *   },
   *   listing: {
   *     fields: ['title:30', 'path:30', 'public', 'createdAt', 'publishDate'],
   *     sort: [{ field: 'createdAt', direction: 'desc' }],
   *     perPage: 50,
   *   },
   *   perPageLimit: 50,
   *   search: ['title', 'path', 'description', 'blocks'],
   * }
   * ```
   */
  pages?: Pages | false

  /**
   * Preset related settings. Set to `false` to disable presets completely.
   *
   * Note: The settings provided here will be merged with the default settings.
   *
   * Defaults to:
   *
   * ```js
   * {
   *   labels: {
   *     title: { singular: 'Preset', plural: 'Presets' },
   *     item: { singular: 'Preset', plural: 'Presets' }
   *   },
   *   listing: {
   *     fields: ['title', 'createdAt'],
   *     sort: [{ field: 'createdAt', direction: 'desc' }]
   *   },
   *   icon: 'transform',
   *   perPageLimit: 50,
   *   search: ['title', 'blocks'],
   * }
   * ```
   */
  presets?: Presets | false

  /**
   * Upload related settings. Set to `false` to disable uploads completely.
   *
   * Note: The settings provided here will be merged with the default settings.
   *
   * Defaults to:
   *
   * ```js
   * {
   *   fields: [],
   *   labels: {
   *     title: { singular: 'Media', plural: 'Media' },
   *   },
   *   icon: 'photo',
   *   perPageLimit: 50,
   *   uploadLimit: '16MB',
   *   search: ['name', 'path', 'mime', 'description'],
   * }
   * ```
   */
  uploads?: Uploads | false

  /**
   * Role related settings.
   *
   * Note: The settings provided here will be merged with the default settings.
   *
   * Defaults to:
   *
   * ```js
   * {
   *   labels: {
   *     title: { singular: 'Role', plural: 'Roles' },
   *     item: { singular: 'Role', plural: 'Roles' }
   *   },
   *   listing: {
   *     fields: ['name', 'capabilities:50', 'createdAt'],
   *     sort: [{ field: 'name', direction: 'asc' }]
   *   },
   *   icon: 'shield',
   *   perPageLimit: 50,
   *   search: ['name', 'capabilities'],
   * }
   * ```
   */
  roles?: Roles

  /**
   * User related settings.
   *
   * Note: The settings provided here will be merged with the default settings.
   *
   * Defaults to:
   *
   * ```js
   * {
   *   fields: [
   *     { name: 'firstName', type: 'text' },
   *     { name: 'lastName', type: 'text' }
   *   ],
   *   labels: {
   *     title: { singular: 'User', plural: 'Users' },
   *     item: { singular: 'User', plural: 'Users' }
   *   },
   *   listing: {
   *     fields: ['email', 'firstName', 'lastName', 'role', 'isAdmin', 'createdAt'],
   *     sort: [{ field: 'email', direction: 'asc' }],
   *     perPage: 50,
   *   },
   *   icon: 'users',
   *   perPageLimit: 50,
   *   search: ['email', 'firstName', 'lastName'],
   * }
   * ```
   */
  users?: Users

  /**
   * A callback executed when the cache is cleared. It takes an object argument with the following properties:
   *
   * - `pageIds` - An array of modified page IDs with cleared cache.
   * - `pagePaths` - An array of page paths related to the modified pages.
   * - `presetIds` - An array of modified presets.
   * - `uploadIds` - An array of modified uploads.
   * - `postIds` - An array of modified posts.
   * - `userIds` - An array of modified users.
   * - `settingIds` - An array of modified settings group IDs with cleared cache.
   * - `settingsGroups` - An array of settings group names related to the modified settings.
   *
   * You can use this hook, for example, to trigger cache clearing on your CDN when something is updated in the CMS.
   */
  onFlush?: (changed: {
    pageIds: number[]
    pagePaths: string[]
    presetIds: number[]
    uploadIds: number[]
    postIds: number[]
    userIds: number[]
    settingIds: number[]
    settingsGroups: string[]
  }) => Promise<any> | any

  /**
   * A key-value pair object of reusable field properties that can be used to extend fields by leveraging their `extend` property.
   * The key represents the extension name written in camel-case, and the value should correspond to the field properties of the field where it will be used.
   * Only undefined field properties can be extended.
   *
   * Defaults to `{}`.
   *
   * @example
   * ```js
   * {
   *   colorChoices: {
   *     choices: [
   *       { label: 'Black', value: '#000' },
   *       { label: 'White', value: '#fff' }
   *     ]
   *   }
   * }
   * ```
   */
  fieldStubs?: Record<string, Record<string, any>>

  /**
   * A callback function triggered after the application is booted and the primary instance is resolved.
   * The callback may delay up to one minute if the app is restarted.
   * The function is called for all instances.
   */
  onInit?: (isPrimaryInstance: boolean) => Promise<any> | any

  /**
   * Determines whether to enable search engine optimization (SEO) settings.
   * When enabled, these settings are accessible via the API endpoint `/api/settings/seo`.
   *
   * Defaults to `true` (enabled).
   */
  seo?: boolean

  /**
   * An array of registered jobs along with their names and callback functions.
   *
   * Jobs are tasks that take too long to perform during a typical web request,
   * such as sending emails or processing large files. Instead of being run in
   * real-time, jobs are processed in the background by a worker instance.
   * Workers check for new jobs at regular intervals, which is every 5 seconds
   * by default. You can adjust this interval by setting the `HEARTBEAT`
   * environment variable in your .env file. By moving time-intensive tasks to
   * a queue, your application can respond to web requests quickly and provide
   * a better user experience for your customers.
   */
  jobs?: {
    /**
     * A unique name for the job.
     *
     * The names `flush`, `flushPublic`, and `rebuildSitemap` are
     * reserved for internal tasks.
     */
    name: string

    /**
     * A function to execute when the job is being processed.
     */
    callback: (payload: string | null) => Promise<any> | any
  }[]
}

export type ConfigFactory = () => Promise<Config> | Config

/*
|--------------------------------------------------------------------------
| Block
|--------------------------------------------------------------------------
|
*/

export interface Block<AllBlocks extends string = string> {
  /**
   * A unique pascal-cased string that identifies the block (e.g. 'Button', 'ButtonGroup', etc.).
   */
  name: string

  /**
   * The block label displayed in the dashboard.
   *
   * Defaults to an auto-generated label from the block `name`.
   */
  label?: string

  /**
   * A short text displayed as a tooltip in the block selection menu.
   *
   * Defaults to `''`.
   */
  description?: string

  /**
   * The icon displayed for the block in the block selection popup.
   *
   * List of available icons: https://pruvious.com/icons
   *
   * Defaults to `'components'`.
   */
  icon?: Icon

  /**
   * An array of custom fields to be used in the block.
   */
  fields: BlockField[]

  /**
   * A key-value pair object that contains the slot name and an object for defining the slot's label and its allowed child blocks.
   *
   * Defaults to `undefined`.
   */
  slots?: Record<string, Slot<AllBlocks>>
}

export interface BlockRecord {
  id: string
  name: string
  props?: Record<string, any>
  children?: Record<string, BlockRecord[]>
}

export type BlockFactory = () => Promise<Block> | Block

/*
|--------------------------------------------------------------------------
| Base models
|--------------------------------------------------------------------------
|
*/

export interface QueryableModel {
  /**
   * The title, description, and item labels of the model.
   */
  labels?: {
    /**
     * The title displayed in the menu and overview page in the dashboard
     * (capitalized).
     */
    title?: {
      /**
       * Singular title (capitalized).
       */
      singular: string

      /**
       * Plural title (capitalized).
       */
      plural: string
    }

    /**
     * A noun used for row items (capitalized).
     */
    item?: {
      /**
       * Singular item (capitalized).
       */
      singular: string

      /**
       * Plural item (capitalized).
       */
      plural: string
    }

    /**
     * A brief summary that is displayed in tooltips in the menu and titles in the dashboard.
     *
     * Defaults to `''`.
     */
    description?: string
  }

  /**
   * The icon shown in the dashboard menu.
   *
   * List of available icons: https://pruvious.com/icons
   */
  icon?: Icon

  /**
   * Settings related to the table overview in the dashboard.
   */
  listing?: {
    /**
     * Specifies the default field and sort direction in which the table rows
     * are sorted.
     */
    sort?: {
      /**
       * The field name used in the `order by` SQL clause.
       */
      field: string

      /**
       * The sort direction.
       *
       * - `asc` - Ascending
       * - `desc` - Descending
       */
      direction: 'asc' | 'desc'
    }[]

    /**
     * Specifies the default field names for the table columns.
     *
     * In addition, the parameter can include the column width (in percentage) using the `field:percent` annotation. For example, `'createdAt:20'` would set the width of the `'createdAt'` column to be 20%.
     */
    fields?: string[]

    /**
     * The number of rows per page shown in the table. This value cannot be
     * larger than the `perPageLimit` value.
     */
    perPage?: number
  }

  /**
   * The maximum number of rows that can be returned in pagination queries.
   *
   * Defaults to `50`.
   */
  perPageLimit?: number

  /**
   * Fields to be used in the search. The field values are stored as structured
   * keywords in the database in the specified order.
   *
   * This parameter can also contain a specific search index by using the
   * the `field:index` annotation (e.g. `'title:9'`). The index parameter always
   * overrides the standard array order and can be used to have better control
   * over sorting of nested fields and block models.
   *
   * @see https://pruvious.com/documentation/essentials/query-builder#search
   */
  search?: string[]
}

/*
|--------------------------------------------------------------------------
| Pages
|--------------------------------------------------------------------------
|
*/

export interface Pages extends QueryableModel {
  /**
   * Page types serve the purpose of grouping page layouts together and facilitating the inclusion of specific blocks based on the type of page.
   *
   * Defaults to `{ default: {} }`.
   */
  types?: Record<string, PageType>

  /**
   * Fields to be used in the search. The field values are stored as structured
   * keywords in the database in the specified order.
   *
   * This parameter can also contain a specific search index by using the
   * the `field:index` annotation (e.g. `'title:9'`). The index parameter always
   * overrides the standard array order and can be used to have better control
   * over sorting of nested fields and block models.
   *
   * Block fields can be sorted or disabled separately by setting their
   * `search` parameter to a specific index number or `false`.
   *
   * Defaults to `['title', 'path', 'description', 'blocks']`
   *
   * @see https://pruvious.com/documentation/essentials/query-builder#search
   */
  search?: string[]

  /**
   * The title, description, and item labels of the "Page" model.
   *
   * Defaults to:
   *
   * ```js
   * {
   *   title: { singular: 'Page', plural: 'Pages' },
   *   item: { singular: 'Page', plural: 'Pages' }
   * }
   * ```
   */
  labels?: QueryableModel['labels']

  /**
   * The icon shown in the dashboard menu.
   *
   * List of available icons: https://pruvious.com/icons
   *
   * Defaults to `'note'`.
   */
  icon?: Icon

  /**
   * Settings related to the table overview in the dashboard.
   *
   * Defaults to:
   *
   * ```js
   * {
   *   fields: ['title:30', 'path:30', 'public', 'createdAt', 'publishDate'],
   *   sort: [{ field: 'createdAt', direction: 'desc' }],
   *   perPage: 50,
   * }
   * ```
   */
  listing?: QueryableModel['listing']

  /**
   * An array of custom fields to be used in pages.
   *
   * Defaults to `[]`.
   *
   * ---
   *
   * Pages have the following standard fields by default:
   *
   * - `id` - A unique positive integer used to identify pages.
   * - `public` - A boolean that indicates whether a page is published (`true`) or in draft mode (`false`).
   * - `path` - A unique URL-friendly lowercase slug used as the path name in the URL.
   * - `language` - The language code of the page.
   * - `translationId` - An internal ID used to link the page to its related translations.
   * - `title` - The document title displayed in the browser's title bar or page tab.
   * - `baseTitle` - A flag that determines whether the base title defined in the SEO settings should be displayed along with the page title.
   * - `description` - A brief summary of the web page's content, typically displayed in search results and social media shares.
   * - `metaTags` - An array of meta tag objects with their respective `name` and `content` properties.
   * - `sharingImage` - An image typically displayed when sharing the page's link on social media platforms. If not specified, the default sharing image from the SEO settings is used.
   * - `visible` - A setting that determines whether the page should be visible to search engines, controlled through the robots meta tag.
   * - `type` - The page type used for grouping page layouts together and facilitating the inclusion of specific blocks.
   * - `layout` - The layout that defines the base template of the page.
   * - `blocks` - An array of block objects used to construct the page's content.
   * - `publishDate` - The date when the page was published. You can schedule the page to be published at a specific date and time in the future.
   * - `createdAt` - An automatically generated date string that indicates when a page is created.
   * - `updatedAt` - An automatically generated date string indicating when a page was last updated.
   */
  fields?: QueryableField[]

  /**
   * A callback function that is triggered before creating a page and after validating its field values.
   * The field values can be modified inside this hook.
   */
  onCreate?: (data: Partial<PageRecord>) => Promise<any> | any

  /**
   * A callback function that is invoked after reading and before populating a page from the database.
   * The field values can be modified inside this hook.
   *
   * Note: Any modifications made to the data will be cached in public API endpoints (`/api/path/<path>`).
   * As a result, the associated function won't be invoked each time the page is fetched.
   * If you require the function to be called every time the page is fetched, you should consider utilizing the `onFetch` hook instead.
   */
  onRead?: (page: PageRecord) => Promise<any> | any

  /**
   * A callback function that is invoked after reading and populating a page from the database.
   * If the values are not populated, this function will not be called.
   * The field values can be modified inside this hook.
   *
   * Note: Any modifications made to the data will be cached in public API endpoints (`/api/path/<path>`).
   * As a result, the associated function won't be invoked each time the page is fetched.
   * If you require the function to be called every time the page is fetched, you should consider utilizing the `onFetch` hook instead.
   */
  onPopulate?: (page: PageRecord) => Promise<any> | any

  /**
   * A callback function that is invoked when using the default public API endpoint (`/api/path/<path>`).
   * The field values can be modified inside this hook.
   */
  onFetch?: (page: PageRecord) => Promise<any> | any

  /**
   * A callback function that is triggered before updating a page and after validating its field values.
   * The field values can be modified inside this hook.
   */
  onUpdate?: (data: Partial<PageRecord>) => Promise<any> | any

  /**
   * A callback function that is triggered before a page is deleted.
   */
  onDelete?: (pageId: number) => Promise<any> | any
}

export interface PageType {
  /**
   * The type label that is displayed in the select menu when editing a page in the dashboard.
   *
   * Defaults to an auto-generated label based on the page type key.
   */
  label?: string

  /**
   * A key-value object that defines the available layouts for this page type.
   *
   * Defaults to `{ default: {} }`.
   */
  layouts?: Record<string, PageLayout>

  /**
   * An array of block names that are allowed for use with this page type.
   * You can also use an asterisk (*) to allow all available blocks to be used.
   *
   * Defaults to `'*'`.
   */
  allowedBlocks?: string[] | '*'

  /**
   * An array of block names that are allowed to be used as root (first-level) blocks when using this page type.
   * You can use an asterisk (*) to allow all `allowedBlocks` to be used as root blocks.
   * The values in the array will be intersected with the `allowedBlocks` property.
   *
   * Defaults to `'*'`.
   */
  rootBlocks?: string[] | '*'
}

export interface PageLayout {
  /**
   * The layout label that is displayed in the select menu when editing a page in the dashboard.
   *
   * Defaults to an auto-generated label based on the page layout key.
   */
  label?: string

  /**
   * An array of block names that are allowed for use with this page layout.
   * You can also use an asterisk (*) to allow all available blocks to be used.
   *
   * Defaults to `'*'`.
   */
  allowedBlocks?: string[] | '*'

  /**
   * An array of block names that are allowed to be used as root (first-level) blocks when using this page layout.
   * You can use an asterisk (*) to allow all `allowedBlocks` to be used as root blocks.
   * The values in the array will be intersected with the `allowedBlocks` property, and `rootBlocks` property of the parent page type.
   *
   * Defaults to `'*'`.
   */
  rootBlocks?: string[] | '*'
}

export type PageRecord = Record<string, any> & {
  id: number
  public: boolean
  path: string
  language: string
  translationId: number
  translations?: Record<string, { id: number; path: string; url: string } | null>
  url?: string
  title: string
  baseTitle: boolean
  description: string
  visible: boolean
  sharingImage: number | null
  metaTags: MetaTag[]
  type: string
  layout: string
  blocks: BlockRecord[]
  publishDate: string | null
  createdAt: string
  updatedAt: string
}

/*
|--------------------------------------------------------------------------
| Presets
|--------------------------------------------------------------------------
|
*/

export interface Presets extends QueryableModel {
  /**
   * Fields to be used in the search. The field values are stored as structured
   * keywords in the database in the specified order.
   *
   * This parameter can also contain a specific search index by using the
   * the `field:index` annotation (e.g. `'title:9'`). The index parameter always
   * overrides the standard array order and can be used to have better control
   * over sorting of nested fields and block models.
   *
   * Block fields can be sorted or disabled separately by setting their
   * `search` parameter to a specific index number or `false`.
   *
   * Defaults to `['title', 'blocks']`
   *
   * @see https://pruvious.com/documentation/essentials/query-builder#search
   */
  search?: string[]

  /**
   * The title, description, and item labels of the "Preset" model.
   *
   * Defaults to:
   *
   * ```js
   * {
   *   title: { singular: 'Preset', plural: 'Presets' },
   *   item: { singular: 'Preset', plural: 'Presets' }
   * }
   * ```
   */
  labels?: QueryableModel['labels']

  /**
   * The icon shown in the dashboard menu.
   *
   * List of available icons: https://pruvious.com/icons
   *
   * Defaults to `'transform'`.
   */
  icon?: Icon

  /**
   * Settings related to the table overview in the dashboard.
   *
   * Defaults to:
   *
   * ```js
   * {
   *   fields: ['title', 'createdAt'],
   *   sort: [{ field: 'createdAt', direction: 'desc' }]
   * }
   * ```
   */
  listing?: QueryableModel['listing']

  /**
   * A callback function that is triggered before creating a preset and after validating its field values.
   * The field values can be modified inside this hook.
   */
  onCreate?: (data: Partial<PresetRecord>) => Promise<any> | any

  /**
   * A callback function that is invoked after reading and before populating a preset from the database.
   * The field values can be modified inside this hook.
   */
  onRead?: (preset: PresetRecord) => Promise<any> | any

  /**
   * A callback function that is invoked after reading and populating a preset from the database.
   * If the values are not populated, this function will not be called.
   * The field values can be modified inside this hook.
   */
  onPopulate?: (preset: PresetRecord) => Promise<any> | any

  /**
   * A callback function that is triggered before updating a preset and after validating its field values.
   * The field values can be modified inside this hook.
   */
  onUpdate?: (data: Partial<PresetRecord>) => Promise<any> | any

  /**
   * A callback function that is triggered before a preset is deleted.
   */
  onDelete?: (presetId: number) => Promise<any> | any
}

export type PresetRecord = Record<string, any> & {
  id: number
  language: string
  translationId: number
  translations?: Record<string, { id: number } | null>
  title: string
  blocks: BlockRecord[]
  createdAt: string
  updatedAt: string
}

/*
|--------------------------------------------------------------------------
| Uploads
|--------------------------------------------------------------------------
|
*/

export interface Uploads {
  /**
   * Maximum file size for uploads.
   *
   * If no unit is given, it is assumed the value is in bytes.
   *
   * Note: String values are parsed using the
   * [bytes](https://www.npmjs.com/package/bytes) library.
   *
   * Defaults to `'16MB'`.
   */
  uploadLimit?: string | number

  /**
   * Fields to be used in the search. The field values are stored as structured
   * keywords in the database in the specified order.
   *
   * This parameter can also contain a specific search index by using the
   * the `field:index` annotation (e.g. `'name:9'`). The index parameter always
   * overrides the standard array order and can be used to have better control
   * over sorting of nested fields.
   *
   * Defaults to `['name', 'path', 'mime', 'description']`
   *
   * @see https://pruvious.com/documentation/essentials/query-builder#search
   */
  search?: string[]

  /**
   * The title, description, and item labels of the "Upload" model.
   *
   * Defaults to:
   *
   * ```js
   * {
   *   title: { singular: 'Media', plural: 'Media' },
   * }
   * ```
   */
  labels?: {
    /**
     * The title displayed in the menu and overview page in the dashboard
     * (capitalized).
     */
    title?: {
      /**
       * Singular title (capitalized).
       */
      singular: string

      /**
       * Plural title (capitalized).
       */
      plural: string
    }

    /**
     * A short descriptive summary that is displayed in tooltips in the menu
     * and titles in the dashboard.
     *
     * Defaults to `''`.
     */
    description?: string
  }

  /**
   * The icon shown in the dashboard menu.
   *
   * List of available icons: https://pruvious.com/icons
   *
   * Defaults to `'photo'`.
   */
  icon?: Icon

  /**
   * The maximum number of rows that can be returned in pagination queries.
   *
   * Defaults to `50`.
   */
  perPageLimit?: number

  /**
   * Additional upload fields. Standard fields are:
   *
   * - `id`
   * - `path`
   * - `mime`
   * - `kind`
   * - `name`
   * - `directoryId`
   * - `description`
   * - `info`
   * - `size`
   * - `thumbnail`
   * - `createdAt`
   * - `updatedAt`
   *
   * Defaults to `[]`.
   */
  fields?: (
    | Exclude<QueryableField, FileField | ImageField | RepeaterField>
    | FieldGroup<Exclude<QueryableField, FileField | ImageField | RepeaterField>>
  )[]

  /**
   * A callback function that is triggered before creating an upload and after validating its field values.
   * The field values can be modified inside this hook.
   *
   * Note: The `file` parameter is read-only.
   */
  onCreate?: (data: Partial<UploadRecord> & { file: any }) => Promise<any> | any

  /**
   * A callback function that is invoked after reading and before populating an upload from the database.
   * The field values can be modified inside this hook.
   */
  onRead?: (upload: UploadRecord) => Promise<any> | any

  /**
   * A callback function that is invoked after reading and populating an upload from the database.
   * If the values are not populated, this function will not be called.
   * The field values can be modified inside this hook.
   */
  onPopulate?: (upload: UploadRecord) => Promise<any> | any

  /**
   * A callback function that is triggered before updating an upload and after validating its field values.
   * The field values can be modified inside this hook.
   */
  onUpdate?: (data: Partial<UploadRecord>) => Promise<any> | any

  /**
   * A callback function that is triggered before an upload is deleted.
   */
  onDelete?: (uploadId: number) => Promise<any> | any
}

export type UploadRecord = {
  id: number
  path: string
  mime: string | null
  kind: string
  name: string
  directoryId: number | null
  directory?: {
    id: number
    path: string
    name: string
  } | null
  url?: string
  description: string
  info: Record<string, any> & {
    format?: string
    width?: number
    height?: number
  }
  size: number
  thumbnail: string
  createdAt: string
  updatedAt: string
}

/*
|--------------------------------------------------------------------------
| Collections
|--------------------------------------------------------------------------
|
*/

export interface Collection extends QueryableModel {
  /**
   * Specifies whether the collection is visible in the dashboard menu.
   *
   * Defaults to `true`.
   */
  visible?: boolean

  /**
   * Fields to be used in the search. The field values are stored as structured
   * keywords in the database in the specified order.
   *
   * This parameter can also contain a specific search index by using the
   * the `field:index` annotation (e.g. `'title:9'`). The index parameter always
   * overrides the standard array order and can be used to have better control
   * over sorting of nested fields.
   *
   * Defaults to `[]`
   *
   * @see https://pruvious.com/documentation/essentials/query-builder#search
   */
  search?: string[]

  /**
   * The title, description, and item labels of the collection model.
   *
   * Defaults to auto-generated values from the collection `name`.
   */
  labels?: QueryableModel['labels']

  /**
   * The icon displayed for the collection in the dashboard menu.
   *
   * List of available icons: https://pruvious.com/icons
   *
   * Defaults to `'pin'`.
   */
  icon?: Icon

  /**
   * Settings related to the table overview in the dashboard.
   *
   * Defaults to:
   *
   * ```js
   * {
   *   fields: ['id', 'public', 'createdAt'],
   *   sort: [{ field: 'createdAt', direction: 'desc' }]
   * }
   * ```
   */
  listing?: QueryableModel['listing']

  /**
   * A unique URL-friendly plural slug used to identify the collection in API
   * endpoints and queries.
   *
   * The slug can contain only alphanumeric characters and hyphens. Additionally,
   * it must begin and end with an alphanumeric character, and it cannot have two
   * consecutive hyphens (e.g. 'products', 'news', form-entries', etc.).
   */
  name: string

  /**
   * Determines whether the items in the collection can be translated.
   *
   * Defaults to `true`.
   */
  translatable?: boolean

  /**
   * An array of custom fields to be used in the collection.
   *
   * Defaults to `[]`.
   *
   * ---
   *
   * Collections have the following standard fields by default:
   *
   * - `id` - A unique positive integer used to identify collection items (posts).
   * - `public` - A boolean that indicates whether a post is published (`true`) or in draft mode (`false`).
   * - `language` - The language code of the post when the collection is set as translatable.
   * - `translationId` - An internal ID used to link the post to its related translations.
   * - `publishDate` - The date when the post was published. You can schedule the post to be published at a specific date and time in the future.
   * - `createdAt` - An automatically generated date string that indicates when a post is created.
   * - `updatedAt` - An automatically generated date string indicating when a post was last updated.
   */
  fields?: (QueryableField | FieldGroup<QueryableField>)[]

  /**
   * A callback function that is triggered before creating a post and after validating its field values.
   * The field values can be modified inside this hook.
   */
  onCreate?: (post: Partial<PostRecord>) => Promise<any> | any

  /**
   * A callback function that is invoked after reading and before populating a post from the database.
   * The field values can be modified inside this hook.
   */
  onRead?: (post: PostRecord) => Promise<any> | any

  /**
   * A callback function that is invoked after reading and populating a post from the database.
   * If the values are not populated, this function will not be called.
   * The field values can be modified inside this hook.
   */
  onPopulate?: (post: PostRecord) => Promise<any> | any

  /**
   * A callback function that is triggered before updating a post and after validating its field values.
   * The field values can be modified inside this hook.
   */
  onUpdate?: (post: Partial<PostRecord>) => Promise<any> | any

  /**
   * A callback function that is triggered before a post is deleted.
   */
  onDelete?: (postId: number) => Promise<any> | any
}

export type PostRecord = Record<string, any> & {
  id: number
  public: boolean
  language: string
  translationId: number
  translations?: Record<string, { id: number } | null>
  publishDate: string | null
  createdAt: string
  updatedAt: string
}

export type CollectionFactory = () => Promise<Collection> | Collection

/*
|--------------------------------------------------------------------------
| Roles
|--------------------------------------------------------------------------
|
*/

export interface Roles extends QueryableModel {
  /**
   * Fields to be used in the search. The field values are stored as structured
   * keywords in the database in the specified order.
   *
   * This parameter can also contain a specific search index by using the
   * the `field:index` annotation (e.g. `'name:9'`). The index parameter always
   * overrides the standard array order and can be used to have better control
   * over sorting of nested fields.
   *
   * Defaults to `['name', 'capabilities']`
   *
   * @see https://pruvious.com/documentation/essentials/query-builder#search
   */
  search?: string[]

  /**
   * The title, description, and item labels of the "Role" model.
   *
   * Defaults to:
   *
   * ```js
   * {
   *   title: { singular: 'Role', plural: 'Roles' },
   *   item: { singular: 'Role', plural: 'Roles' }
   * }
   * ```
   */
  labels?: QueryableModel['labels']

  /**
   * The icon shown in the dashboard menu.
   *
   * List of available icons: https://pruvious.com/icons
   *
   * Defaults to `'shield'`.
   */
  icon?: Icon

  /**
   * Settings related to the table overview in the dashboard.
   *
   * Defaults to:
   *
   * ```js
   * {
   *   fields: ['name', 'capabilities:50', 'createdAt'],
   *   sort: [{ field: 'name', direction: 'asc' }]
   * }
   * ```
   */
  listing?: QueryableModel['listing']

  /**
   * A callback function that is triggered before creating a role and after validating its field values.
   * The field values can be modified inside this hook.
   */
  onCreate?: (data: Partial<RoleRecord>) => Promise<any> | any

  /**
   * A callback function that is invoked after reading and before populating a role from the database.
   * The field values can be modified inside this hook.
   */
  onRead?: (role: RoleRecord) => Promise<any> | any

  /**
   * A callback function that is invoked after reading and populating a role from the database.
   * If the values are not populated, this function will not be called.
   * The field values can be modified inside this hook.
   */
  onPopulate?: (role: RoleRecord) => Promise<any> | any

  /**
   * A callback function that is triggered before updating a role and after validating its field values.
   * The field values can be modified inside this hook.
   */
  onUpdate?: (data: Partial<RoleRecord>) => Promise<any> | any

  /**
   * A callback function that is triggered before a role is deleted.
   */
  onDelete?: (roleId: number) => Promise<any> | any
}

export type RoleRecord = Record<string, any> & {
  id: number
  name: string
  capabilities: string[]
  users?: UserRecord[]
  createdAt: string
  updatedAt: string
}

/*
|--------------------------------------------------------------------------
| Users
|--------------------------------------------------------------------------
|
*/

export interface Users extends QueryableModel {
  /**
   * Fields to be used in the search. The field values are stored as structured
   * keywords in the database in the specified order.
   *
   * This parameter can also contain a specific search index by using the
   * the `field:index` annotation (e.g. `'email:9'`). The index parameter always
   * overrides the standard array order and can be used to have better control
   * over sorting of nested fields.
   *
   * Defaults to `['email', 'firstName', 'lastName']`
   *
   * @see https://pruvious.com/documentation/essentials/query-builder#search
   */
  search?: string[]

  /**
   * The title, description, and item labels of the "User" model.
   *
   * Defaults to:
   *
   * ```js
   * {
   *   title: { singular: 'User', plural: 'Users' },
   *   item: { singular: 'User', plural: 'Users' }
   * }
   * ```
   */
  labels?: QueryableModel['labels']

  /**
   * The icon shown in the dashboard menu.
   *
   * List of available icons: https://pruvious.com/icons
   *
   * Defaults to `'users'`.
   */
  icon?: Icon

  /**
   * Settings related to the table overview in the dashboard.
   *
   * Defaults to:
   *
   * ```js
   * {
   *   fields: ['email', 'firstName', 'lastName', 'role', 'isAdmin', 'createdAt'],
   *   sort: [{ field: 'email', direction: 'asc' }],
   *   perPage: 50,
   * }
   * ```
   */
  listing?: QueryableModel['listing']

  /**
   * Additional user fields. Standard fields are:
   *
   * - `id`
   * - `email`
   * - `dateFormat`
   * - `timeFormat`
   * - `capabilities`
   * - `role`
   * - `isAdmin`
   * - `createdAt`
   * - `updatedAt`
   *
   * Defaults to:
   *
   * ```js
   * [
   *   { name: 'firstName', type: 'text' },
   *   { name: 'lastName', type: 'text' }
   * ]
   * ```
   */
  fields?: (QueryableField | FieldGroup<QueryableField>)[]

  /**
   * A callback function that is triggered before creating a user and after validating its field values.
   * The field values can be modified inside this hook.
   */
  onCreate?: (data: Partial<UserRecord>) => Promise<any> | any

  /**
   * A callback function that is invoked after reading and before populating a user from the database.
   * The field values can be modified inside this hook.
   */
  onRead?: (user: UserRecord) => Promise<any> | any

  /**
   * A callback function that is invoked after reading and populating a user from the database.
   * If the values are not populated, this function will not be called.
   * The field values can be modified inside this hook.
   */
  onPopulate?: (user: UserRecord) => Promise<any> | any

  /**
   * A callback function that is triggered before updating a user and after validating its field values.
   * The field values can be modified inside this hook.
   */
  onUpdate?: (data: Partial<UserRecord>) => Promise<any> | any

  /**
   * A callback function that is triggered before a user is deleted.
   */
  onDelete?: (userId: number) => Promise<any> | any
}

export type UserRecord = Record<string, any> & {
  id: number
  email: string
  dateFormat: string
  timeFormat: string
  role: number | null
  roleRecord?: {
    id: number
    name: string
  } | null
  isAdmin: boolean
  capabilities: string[]
  combinedCapabilities?: string[]
  createdAt: string
  updatedAt: string
}

/*
|--------------------------------------------------------------------------
| Settings
|--------------------------------------------------------------------------
|
*/

export interface Settings {
  group: string

  /**
   * Specifies whether the settings group fields can be accessed through a public API endpoint (`/api/settings/<group>`).
   *
   * Defaults to `true`.
   */
  public?: boolean

  label?: string
  description?: string

  /**
   * The icon shown in the dashboard menu.
   *
   * List of available icons: https://pruvious.com/icons
   *
   * Defaults to `'settings'`.
   */
  icon?: Icon

  /**
   * Settings fields.
   */
  fields: (Field | FieldGroup)[]

  /**
   * Determines whether the settings group can be configured separately for all
   * defined languages.
   *
   * Defaults to `false` (same settings for all languages).
   */
  translatable?: boolean

  /**
   * A callback function that is invoked after reading and before populating a settings group from the database.
   * The field values can be modified inside this hook.
   *
   * Note: Any modifications made to the data will be cached in public API endpoints (`/api/settings/<group>`).
   * As a result, the associated function won't be invoked each time the settings group is fetched.
   * If you require the function to be called every time the settings group is fetched, you should consider utilizing the `onFetch` hook instead.
   */
  onRead?: (settings: SettingRecord['fields']) => Promise<any> | any

  /**
   * A callback function that is invoked after reading and populating a settings group from the database.
   * The field values can be modified inside this hook.
   *
   * Note: Any modifications made to the data will be cached in public API endpoints (`/api/settings/<group>`).
   * As a result, the associated function won't be invoked each time the settings group is fetched.
   * If you require the function to be called every time the settings group is fetched, you should consider utilizing the `onFetch` hook instead.
   */
  onPopulate?: (settings: SettingRecord['fields']) => Promise<any> | any

  /**
   * A callback function that is invoked when using the default public API endpoint (`/api/settings/<group>`).
   * The field values can be modified inside this hook.
   */
  onFetch?: (settings: SettingRecord['fields']) => Promise<any> | any

  /**
   * A callback function that is triggered before updating a settings group and after validating its field values.
   * The field values can be modified inside this hook.
   */
  onUpdate?: (data: Partial<SettingRecord['fields']>) => Promise<any> | any
}

export type SettingFactory = () => Promise<Settings> | Settings

export type SettingRecord = Record<string, any> & {
  id: number
  group: string
  language: string
  fields: Record<string, any>
  createdAt: string
  updatedAt: string
}

/*
|--------------------------------------------------------------------------
| Queries
|--------------------------------------------------------------------------
|
*/

export interface QueryStringParameters<
  T extends {
    LanguageCode: string
    Model: Record<string, any>
    SelectableField: string
    SortableField: string
    FilterableField: string
    StringField: string
    NumberField: string
    BooleanField: string
  } = {
    LanguageCode: string
    Model: Record<string, any>
    SelectableField: string
    SortableField: string
    FilterableField: string
    StringField: string
    NumberField: string
    BooleanField: string
  },
> {
  /**
   * Specifies the field and sort direction in which the query results are
   * sorted.
   *
   * Defaults to `[{ field: 'createdAt', direction: 'desc' }]`.
   */
  sort?: {
    /**
     * The field name used in the `order by` SQL clause.
     */
    field: T['SortableField']

    /**
     * The sort direction.
     *
     * - `asc` - Ascending
     * - `desc` - Descending
     */
    direction: 'asc' | 'desc'
  }[]

  /**
   * Specifies the filter parameters used in the `where` SQL clauses.
   *
   * Defaults to `undefined`.
   */
  filters?:
    | TypedFilter<T['Model'], T['FilterableField']>
    | OrFilter<T['Model'], T['FilterableField']>
    | AndFilter<T['Model'], T['FilterableField']>

  /**
   * Keywords for searching specific field values. The results are
   * automatically sorted according to a calculated score.
   *
   * The search fields can be defined individually for all models.
   *
   * @see https://pruvious.com/documentation/essentials/query-builder#search
   */
  search?: string

  /**
   * Field names to be returned in the query results (equivalent to the
   * `select` SQL statement).
   *
   * The `id` field is always returned.
   *
   * Defaults to `[]`.
   */
  fields?: T['SelectableField'][]

  /**
   * @todo
   *
   * Defaults to the default language.
   */
  language?: T['LanguageCode']

  /**
   * @todo
   *
   * Defaults to `50`.
   */
  perPage?: number

  /**
   * @todo
   *
   * Defaults to `1`.
   */
  page?: number
}

type TypedFilter<Model extends Record<string, any>, FilterableField extends keyof Model> = Partial<{
  [FieldName in FilterableField]: Filter<Exclude<Model[FieldName], null>>
}>

export type Filter<T = any> =
  | EqFilter<T>
  | EqiFilter<T>
  | NeFilter<T>
  | LtFilter<T>
  | LteFilter<T>
  | GtFilter<T>
  | GteFilter<T>
  | InFilter<T>
  | NotInFilter<T>
  | NullFilter<T>
  | NotNullFilter<T>
  | BetweenFilter<T>
  | StartsWithFilter<T>
  | EndsWithFilter<T>
  | ContainsFilter<T>

/**
 * Filter results where the field value is equal to a specified string, number,
 * or boolean value.
 */
export interface EqFilter<T = any> {
  $eq: (string | number | boolean) & T
}

/**
 * Filter results where the field value is equal to a specified string,
 * ignoring case.
 */
export interface EqiFilter<T = any> {
  $eqi: string & T
}

/**
 * Filter results where the field value is not equal to a specified string,
 * number, or boolean value.
 */
export interface NeFilter<T = any> {
  $ne: (string | number | boolean) & T
}

/**
 * Filter results where the field value is less than a specified number.
 */
export interface LtFilter<T = any> {
  $lt: number & T
}

/**
 * Filter results where the field value is less than or equal to a specified
 * number.
 */
export interface LteFilter<T = any> {
  $lte: number & T
}

/**
 * Filter results where the field value is greater than a specified number.
 */
export interface GtFilter<T = any> {
  $gt: number & T
}

/**
 * Filter results where the field value is greater than or equal to a specified
 * number.
 */
export interface GteFilter<T = any> {
  $gte: number & T
}

/**
 * Filter results where the field value is included in a specified array of
 * strings or numbers.
 */
export interface InFilter<T = any> {
  $in: ((string | number) & T)[]
}

/**
 * Filter results where the field value is not included in a specified array of
 * strings or numbers.
 */
export interface NotInFilter<T = any> {
  $notIn: ((string | number) & T)[]
}

/**
 * Filter results where the field value is `null`.
 */
export interface NullFilter<T = any> {
  $null: true
}

/**
 * Filter results where the field value is not `null`.
 */
export interface NotNullFilter<T = any> {
  $notNull: true
}

/**
 * Filter results where the field value is between two numbers specified in a
 * tuple.
 */
export interface BetweenFilter<T = any> {
  $between: [number & T, number & T]
}

/**
 * Filter results where the field value starts with a specified string.
 *
 * Note: This filter is case-insensitive.
 */
export interface StartsWithFilter<T = any> {
  $startsWith: string & T
}

/**
 * Filter results where the field value ends with a specified string.
 *
 * Note: This filter is case-insensitive.
 */
export interface EndsWithFilter<T = any> {
  $endsWith: string & T
}

/**
 * Filter results where the field value contains a specified string.
 *
 * Note: This filter is case-insensitive.
 */
export interface ContainsFilter<T = any> {
  $contains: string & T
}

export interface OrFilter<
  Model extends Record<string, any> = Record<string, any>,
  FilterableField extends keyof Model = string,
> {
  /**
   * Joins the filters in an `or` expression.
   */
  $or: (
    | TypedFilter<Model, FilterableField>
    | OrFilter<Model, FilterableField>
    | AndFilter<Model, FilterableField>
  )[]
}

export interface AndFilter<
  Model extends Record<string, any> = Record<string, any>,
  FilterableField extends keyof Model = string,
> {
  /**
   * Joins the filters in an `and` expression.
   */
  $and: (
    | TypedFilter<Model, FilterableField>
    | OrFilter<Model, FilterableField>
    | AndFilter<Model, FilterableField>
  )[]
}

/*
|--------------------------------------------------------------------------
| Field
|--------------------------------------------------------------------------
|
*/

export type Field =
  | ButtonsField
  | CheckboxesField
  | CheckboxField
  | DateField
  | DateTimeField
  | EditorField
  | FileField
  | IconField
  | ImageField
  | LinkField
  | NumberField
  | PageField
  | PostField
  | PresetField
  | RepeaterField
  | RoleField
  | SelectField
  | SizeField
  | SliderField
  | SwitchField
  | TextField
  | TextAreaField
  | TimeField
  | UrlField
  | UserField

export type BlockField =
  | (ButtonsField & SearchableField)
  | (CheckboxesField & SearchableField)
  | CheckboxField
  | DateField
  | DateTimeField
  | (EditorField & SearchableField)
  | (FileField & SearchableField)
  | (IconField & SearchableField)
  | (ImageField & SearchableField)
  | (LinkField & SearchableField)
  | (NumberField & SearchableField)
  | (PageField & SearchableField)
  | (PostField & SearchableField)
  | (PresetField & SearchableField)
  | RepeaterField
  | (RoleField & SearchableField)
  | (SelectField & SearchableField)
  | SizeField
  | (SliderField & SearchableField)
  | (SwitchField & SearchableField)
  | (TextField & SearchableField)
  | (TextAreaField & SearchableField)
  | TimeField
  | (UrlField & SearchableField)
  | (UserField & SearchableField)

export type QueryableField =
  | (ButtonsField & SelectableField & SortableField & FilterableField & UniqueField)
  | (CheckboxesField & SelectableField)
  | (CheckboxField & SelectableField & SortableField & FilterableField & UniqueField)
  | (DateField & SelectableField & SortableField & FilterableField & UniqueField)
  | (DateTimeField & SelectableField & SortableField & FilterableField & UniqueField)
  | (EditorField & SelectableField & SortableField & FilterableField & UniqueField)
  | (FileField & SelectableField & FilterableField & UniqueField)
  | (IconField & SelectableField & SortableField & FilterableField & UniqueField)
  | (ImageField & SelectableField & FilterableField & UniqueField)
  | (LinkField & SelectableField)
  | (NumberField & SelectableField & SortableField & FilterableField & UniqueField)
  | (PageField & SelectableField & FilterableField & UniqueField)
  | (PostField & SelectableField & FilterableField & UniqueField)
  | (PresetField & SelectableField & FilterableField & UniqueField)
  | (RepeaterField & SelectableField)
  | (RoleField & SelectableField & FilterableField & UniqueField)
  | (SelectField & SelectableField & SortableField & FilterableField & UniqueField)
  | (SizeField & SelectableField)
  | (SliderField & SelectableField & SortableField & FilterableField & UniqueField)
  | (SwitchField & SelectableField & SortableField & FilterableField & UniqueField)
  | (TextField & SelectableField & SortableField & FilterableField & UniqueField)
  | (TextAreaField & SelectableField & SortableField & FilterableField & UniqueField)
  | (TimeField & SelectableField & SortableField & FilterableField & UniqueField)
  | (UrlField & SelectableField & SortableField & FilterableField & UniqueField)
  | (UserField & SelectableField & FilterableField & UniqueField)

export interface SearchableField {
  /**
   * The search index used when sorting search results in queries. Results
   * matching field values with a lower search index appear first in the search
   * results.
   *
   * Set to `false` to exclude this field from the search.
   *
   * Defaults to `10`.
   *
   * @see https://pruvious.com/documentation/essentials/query-builder#search
   */
  search?: number | false
}

interface SortableField {
  /**
   * Determines whether query results can be sorted by this field. Only basic
   * field types (strings, numbers, and booleans) can be sorted.
   *
   * Note: The field must be selectable in order to be sortable.
   *
   * Defaults to `true`.
   */
  sortable?: boolean
}

interface FilterableField {
  /**
   * Determines whether query results can be filtered by this field. Only basic
   * field types (strings, numbers, and booleans) can be filtered.
   *
   * Note: The field must be selectable in order to be filterable.
   *
   * Defaults to `true`.
   */
  filterable?: boolean
}

interface UniqueField {
  /**
   * Determines whether the field value must be unique for the model (pages,
   * uploads, posts, or users).
   *
   * Defaults to `false`.
   */
  unique?: boolean
}

interface SelectableField {
  /**
   * Determines whether this field can be selected in queries.
   *
   * Defaults to `true`.
   */
  selectable?: boolean

  /**
   * Whether to prevent editing of the field value after creation.
   *
   * Defaults to `false` (field is editable).
   */
  readonly?: boolean
}

export interface TextField extends RegexValidatableField {
  /**
   * The field type.
   */
  type: 'text'

  /**
   * The default field value to store when no input is provided.
   *
   * Defaults to `''`.
   */
  default?: string

  /**
   * A list of suggestions to auto-complete the field value.
   *
   * Defaults to `[]`.
   */
  suggestions?: string[]

  /**
   * A placeholder text to show when the text field is empty.
   *
   * Defaults to `''`.
   */
  placeholder?: string

  /**
   * Whether to remove whitespace from both ends of a string.
   *
   * Defaults to `true`.
   */
  trim?: boolean
}

export interface TextAreaField extends RegexValidatableField {
  /**
   * The field type.
   */
  type: 'textArea'

  /**
   * The default field value to store when no input is provided.
   *
   * Defaults to `''`.
   */
  default?: string

  /**
   * A placeholder text to show when the textarea field is empty.
   *
   * Defaults to `''`.
   */
  placeholder?: string

  /**
   * Whether to remove whitespace from both ends of a string.
   *
   * Defaults to `true`.
   */
  trim?: boolean
}

export interface EditorField extends RegexValidatableField {
  /**
   * The field type.
   */
  type: 'editor'

  /**
   * The default field value to store when no input is provided.
   *
   * Defaults to `''`.
   */
  default?: string

  /**
   * A placeholder text to show when the editor field is empty.
   *
   * Defaults to `''`.
   */
  placeholder?: string

  /**
   * @todo
   *
   * Defaults to `['bold', 'italic', 'underline']`.
   */
  toolbar?: Exclude<EditorToolbarItem, 'fullscreen'>[]

  /**
   * @todo
   *
   * Defaults to `[]`.
   */
  blockFormats?: {
    className: string
    label?: string
    tags?: string[]
  }[]

  /**
   * @todo
   *
   * Defaults to `[]`.
   */
  inlineFormats?: {
    className: string
    label?: string
  }[]
}

export interface NumberField extends RegexValidatableField {
  /**
   * The field type.
   */
  type: 'number'

  /**
   * Maximum number of decimal places.
   *
   * Defaults to `0` (integers).
   */
  decimals?: number

  /**
   * The default field value to store when no input is provided.
   *
   * Defaults to the `min` value or `0`.
   */
  default?: number

  /**
   * A placeholder text to show when the number field is empty.
   *
   * Defaults to `''`.
   */
  placeholder?: string
}

export interface SliderField extends RegexValidatableField {
  /**
   * The field type.
   */
  type: 'slider'

  /**
   * Maximum number of decimal places.
   *
   * Defaults to `0` (integers).
   */
  decimals?: number

  /**
   * A minimum acceptable value for the field.
   *
   * Defaults to `0`.
   */
  min?: number

  /**
   * An acceptable maximum value for the field.
   *
   * Defaults to `100`.
   */
  max?: number

  /**
   * Step between each value.
   *
   * Defaults to `1`.
   */
  step?: number

  /**
   * The default field value to store when no input is provided.
   *
   * Defaults to the `min` value or `0`.
   */
  default?: number
}

export interface ImageField extends BaseField {
  /**
   * The field type.
   */
  type: 'image'

  /**
   * A list of allowed image extensions for the field.
   *
   * Defaults to `['apng', 'avif', 'bmp', 'gif', 'heif', 'jpeg', 'jpg', 'png', 'svg', 'tif', 'tiff', 'webp']`
   */
  allow?: string[]

  /**
   * Discard `sources` optimization for SVG images.
   *
   * Defaults to `false`.
   */
  transformSvgs?: boolean

  /**
   * The minimum allowed width for the original image (in pixels).
   *
   * Defaults to `0`.
   */
  minWidth?: number

  /**
   * The minimum allowed height for the original image (in pixels).
   *
   * Defaults to `0`.
   */
  minHeight?: number

  /**
   * @todo
   *
   * Defaults to `[]`.
   */
  sources?: OptimizedImage[]
}

export interface RepeaterField<T extends string = string> extends CountableField {
  /**
   * The field type.
   */
  type: 'repeater'

  /**
   * Repeated field set.
   */
  subFields: ((Field & { name: T }) | FieldGroup<Field & { name: T }>)[]

  /**
   * Whether each repeater item is required to have unique values.
   *
   * Defaults to `false`.
   */
  distinct?: boolean

  /**
   * A lowercase singular label that appears in the "Add" button below the
   * subfields in the dashboard.
   *
   * Defaults to `'item'` (generated button text is "Add item").
   */
  itemLabel?: string
}

export interface LinkField extends BaseField {
  /**
   * The field type.
   */
  type: 'link'
}

export interface UrlField extends BaseField {
  /**
   * The field type.
   */
  type: 'url'

  /**
   * Whether the field can be linked to an existing page. If enabled, linked
   * page IDs are stored in the database in the `$id` format (e.g. `$1`). The
   * populated value is generated by concatenating the `SITE_BASE_URL`
   * environment variable and the linked page `path`.
   *
   * Linked URL fields do not need to be update when the associated page path
   * changes.
   *
   * Defaults to `false`.
   */
  linkable?: boolean

  /**
   * The default field value.
   *
   * Defaults to `''`.
   */
  default?: string

  /**
   * A placeholder text to show when the URL field is empty.
   *
   * Defaults to `''`.
   */
  placeholder?: string
}

export interface DateField extends BaseField {
  /**
   * The field type.
   */
  type: 'date'

  /**
   * The format in which the date value is returned when the field is
   * populated.
   *
   * @see https://pruvious.com/documentation/fields/date#formats
   *
   * Defaults to `'YYYY-MM-DD'`.
   */
  returnFormat?: string

  /**
   * The default date value to store when no input is provided.
   *
   * Defaults to `null`.
   *
   * @example
   * ```js
   * 1672531200000 // As a timestmap
   * '2023-01-01' // In ISO 8601 format (YYYY-MM-DD)
   * ```
   */
  default?: number | string | null

  /**
   * The minimum acceptable date.
   *
   * Defaults to `undefined` (no minimum date).
   *
   * @example
   * ```js
   * 1672531200000 // As a timestmap
   * '2023-01-01T00:00:00.000Z' // In ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
   * ```
   */
  minDate?: number | string

  /**
   * The maximum acceptable date.
   *
   * Defaults to `undefined` (no maximum date).
   *
   * @example
   * ```js
   * 1672531200000 // As a timestmap
   * '2023-01-01T00:00:00.000Z' // In ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
   * ```
   */
  maxDate?: number | string

  /**
   * A placeholder text to show when the date field is empty.
   *
   * Defaults to `''`.
   */
  placeholder?: string
}

export interface DateTimeField extends BaseField {
  /**
   * The field type.
   */
  type: 'dateTime'

  /**
   * The format in which the date-time value is returned when the field is
   * populated.
   *
   * @see https://pruvious.com/documentation/fields/date-time#formats
   *
   * Defaults to an empty string (ISO 8601).
   */
  returnFormat?: string

  /**
   * Whether the date-time input should display and accept values in UTC.
   * Regardless of this setting, the saved values are always in UTC.
   *
   * Defaults to `false`.
   */
  utc?: boolean

  /**
   * The default date-time value to store when no input is provided.
   *
   * Defaults to `null`.
   *
   * @example
   * ```js
   * 1672531200000 // As a timestmap
   * '2023-01-01T00:00:00.000Z' // In ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
   * ```
   */
  default?: number | string | null

  /**
   * The minimum acceptable date and time.
   *
   * Defaults to `undefined` (no minimum date).
   *
   * @example
   * ```js
   * 1672531200000 // As a timestmap
   * '2023-01-01T00:00:00.000Z' // In ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
   * ```
   */
  minDate?: number | string

  /**
   * The maximum acceptable date and time.
   *
   * Defaults to `undefined` (no maximum date).
   *
   * @example
   * ```js
   * 1672531200000 // As a timestmap
   * '2023-01-01T00:00:00.000Z' // In ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
   * ```
   */
  maxDate?: number | string

  /**
   * A placeholder text to show when the date-time field is empty.
   *
   * Defaults to `''`.
   */
  placeholder?: string
}

export interface TimeField extends BaseField {
  /**
   * The field type.
   */
  type: 'time'

  /**
   * The format in which the time value is returned when the field is
   * populated.
   *
   * @see https://pruvious.com/documentation/fields/time#formats
   *
   * Defaults to `'HH:mm:ss'`.
   */
  returnFormat?: string

  /**
   * The default time value to store when no input is provided.
   *
   * Defaults to `null`.
   *
   * @example
   * ```js
   * 43200000 // As a timestmap
   * '12:00:00.000' // In ISO 8601 format (HH:mm:ss.sss)
   * ```
   */
  default?: number | string | null

  /**
   * A placeholder text to show when the time field is empty.
   *
   * Defaults to `''`.
   */
  placeholder?: string
}

export interface PageField<
  FieldName extends string | number | symbol = string,
  ReturnFieldName extends string | number | symbol = string,
> extends BaseField {
  /**
   * The field type.
   */
  type: 'page'

  /**
   * A placeholder text to show when no page is chosen.
   *
   * Defaults to `''`.
   */
  placeholder?: string

  /**
   * Raw and unpopulated field(s) of the related page shown in the search
   * results and chosen value in the field input in the dashboard.
   *
   * Defaults to `['title', 'path']`.
   */
  choiceLabel?: FieldName | [FieldName, FieldName]

  /**
   * Raw and unpopulated field of the associated page that is displayed in the
   * listing table in the dashboard.
   *
   * Defaults to `'title'`.
   */
  listingLabel?: FieldName

  /**
   * Raw and unpopulated fields of the associated page displayed below the
   * field input in the dashboard.
   *
   * Defaults to `[]`.
   */
  previewFields?: FieldName[]

  /**
   * Prepopulated fields or relations of the associated page to be returned
   * when this field is populated.
   *
   * Defaults to `['id', 'title', 'path']`.
   */
  returnFields?: ReturnFieldName[]

  /**
   * Specifies the language (code) of the search result items. Use a wildcard
   * (*) to show all pages.
   *
   * Defaults to the current language.
   */
  language?: string
}

export interface PresetField<
  FieldName extends string | number | symbol = string,
  ReturnFieldName extends string | number | symbol = string,
> extends BaseField {
  /**
   * The field type.
   */
  type: 'preset'

  /**
   * A placeholder text to show when no preset is chosen.
   *
   * Defaults to `''`.
   */
  placeholder?: string

  /**
   * Raw and unpopulated field(s) of the related preset shown in the search
   * results and chosen value in the field input in the dashboard.
   *
   * Defaults to `'title'`.
   */
  choiceLabel?: FieldName | [FieldName, FieldName]

  /**
   * Raw and unpopulated field of the associated preset that is displayed in
   * the listing table in the dashboard.
   *
   * Defaults to `'title'`.
   */
  listingLabel?: FieldName

  /**
   * Raw and unpopulated fields of the associated preset displayed below the
   * field input in the dashboard.
   *
   * Defaults to `[]`.
   */
  previewFields?: FieldName[]

  /**
   * Prepopulated fields or relations of the associated preset to be returned
   * when this field is populated.
   *
   * Defaults to `['id', 'blocks']`.
   */
  returnFields?: ReturnFieldName[]

  /**
   * Specifies the language (code) of the search result items. Use a wildcard
   * (*) to show all presets.
   *
   * Defaults to the current language.
   */
  language?: string
}

export interface FileField<
  FieldName extends string | number | symbol = string,
  ReturnFieldName extends string | number | symbol = string,
> extends BaseField {
  /**
   * The field type.
   */
  type: 'file'

  /**
   * A placeholder text to show when no file is chosen.
   *
   * Defaults to `''`.
   */
  placeholder?: string

  /**
   * Raw and unpopulated field(s) of the related file shown in the search
   * results and chosen value in the field input in the dashboard.
   *
   * Defaults to `'path'`.
   */
  choiceLabel?: FieldName | [FieldName, FieldName]

  /**
   * Raw and unpopulated field of the associated file that is displayed in
   * the listing table in the dashboard.
   *
   * Defaults to `'path'`.
   */
  listingLabel?: FieldName

  /**
   * Raw and unpopulated fields of the associated file displayed below the
   * field input in the dashboard.
   *
   * Defaults to `[]`.
   */
  previewFields?: FieldName[]

  /**
   * Prepopulated fields or relations of the associated file to be returned
   * when this field is populated.
   *
   * Defaults to `['id', 'url']`.
   */
  returnFields?: ReturnFieldName[]
}

export interface PostField<FieldName extends any = string, ReturnFieldName extends any = string>
  extends BaseField {
  /**
   * The field type.
   */
  type: 'post'

  /**
   * Name of the post collection.
   */
  collection: string

  /**
   * A placeholder text to show when no post is chosen.
   *
   * Defaults to `''`.
   */
  placeholder?: string

  /**
   * Raw and unpopulated field(s) of the related post shown in the search
   * results and chosen value in the field input in the dashboard.
   *
   * Defaults to `'id'`.
   */
  choiceLabel?: FieldName | [FieldName, FieldName]

  /**
   * Raw and unpopulated field of the associated post that is displayed in
   * the listing table in the dashboard.
   *
   * Defaults to `'id'`.
   */
  listingLabel?: FieldName

  /**
   * Raw and unpopulated fields of the associated post displayed below the
   * field input in the dashboard.
   *
   * Defaults to `[]`.
   */
  previewFields?: FieldName[]

  /**
   * Prepopulated fields or relations of the associated post to be returned
   * when this field is populated.
   *
   * Defaults to `['id']`.
   */
  returnFields?: ReturnFieldName[]

  /**
   * Specifies the language (code) of the search result items. Use a wildcard
   * (*) to show all items.
   *
   * Note that the collection must be translatable for this parameter to work.
   *
   * Defaults to the current language.
   */
  language?: string
}

export interface RoleField<
  FieldName extends string | number | symbol = string,
  ReturnFieldName extends string | number | symbol = string,
> extends BaseField {
  /**
   * The field type.
   */
  type: 'role'

  /**
   * A placeholder text to show when no role is chosen.
   *
   * Defaults to `''`.
   */
  placeholder?: string

  /**
   * Raw and unpopulated field(s) of the related role shown in the search
   * results and chosen value in the field input in the dashboard.
   *
   * Defaults to `'name'`.
   */
  choiceLabel?: FieldName | [FieldName, FieldName]

  /**
   * Raw and unpopulated field of the associated role that is displayed in the
   * listing table in the dashboard.
   *
   * Defaults to `'name'`.
   */
  listingLabel?: FieldName

  /**
   * Raw and unpopulated fields of the associated role displayed below the
   * field input in the dashboard.
   *
   * Defaults to `[]`.
   */
  previewFields?: FieldName[]

  /**
   * Prepopulated fields or relations of the associated role to be returned
   * when this field is populated.
   *
   * Defaults to `['id', 'name', 'capabilities']`.
   */
  returnFields?: ReturnFieldName[]
}

export interface UserField<
  FieldName extends string | number | symbol = string,
  ReturnFieldName extends string | number | symbol = string,
> extends BaseField {
  /**
   * The field type.
   */
  type: 'user'

  /**
   * A placeholder text to show when no user is chosen.
   *
   * Defaults to `''`.
   */
  placeholder?: string

  /**
   * Raw and unpopulated field(s) of the related user shown in the search
   * results and chosen value in the field input in the dashboard.
   *
   * Defaults to `'email'`.
   */
  choiceLabel?: FieldName | [FieldName, FieldName]

  /**
   * Raw and unpopulated field of the associated user that is displayed in the
   * listing table in the dashboard.
   *
   * Defaults to `'email'`.
   */
  listingLabel?: FieldName

  /**
   * Raw and unpopulated fields of the associated user displayed below the
   * field input in the dashboard.
   *
   * Defaults to `[]`.
   */
  previewFields?: FieldName[]

  /**
   * Prepopulated fields or relations of the associated user to be returned
   * when this field is populated.
   *
   * Defaults to `['id', 'email']`.
   */
  returnFields?: ReturnFieldName[]
}

export interface SelectField<T extends string = string> extends BaseField {
  /**
   * Allows the user to make a choice between one of many possible mutually
   * exclusive options.
   */
  type: 'select'

  /**
   * A set of possible selections (options).
   *
   * Defaults to `[]`.
   */
  choices?: {
    /**
     * The choice label displayed in the UI.
     */
    label: string

    /**
     * The choice value stored in the database.
     */
    value: T
  }[]

  /**
   * Determines whether the field value can be cleared and set to `null`.
   *
   * Defaults to `false`.
   */
  nullable?: boolean

  /**
   * The default field value to store when no input is provided.
   *
   * Defaults to `null`.
   */
  default?: T | null

  /**
   * A placeholder text to show when nothing is selected.
   *
   * Defaults to `''`.
   */
  placeholder?: string
}

export interface ButtonsField<T extends string | number | symbol = string> extends BaseField {
  /**
   * Allows the user to make a choice between one of many possible mutually
   * exclusive options.
   */
  type: 'buttons'

  /**
   * A set of possible selections (buttons).
   *
   * Defaults to `[]`.
   */
  choices?: {
    /**
     * The choice label displayed in the UI.
     */
    label: string

    /**
     * The choice value stored in the database.
     */
    value: T
  }[]

  /**
   * The default field value to store when no input is provided.
   *
   * Defaults to `null`.
   */
  default?: T | null
}

export interface SwitchField extends BaseField {
  /**
   * Allows the user to make a choice between one of two possible mutually
   * exclusive options.
   */
  type: 'switch'

  /**
   * Label displayed for the `true` option.
   *
   * Defaults to `Yes`.
   */
  trueLabel?: string

  /**
   * Label displayed for the `false` option.
   *
   * Defaults to `No`.
   */
  falseLabel?: string

  /**
   * The default field value to store when no input is provided.
   *
   * Defaults to `false`.
   */
  default?: boolean
}

export interface CheckboxField extends BaseField {
  /**
   * Allows the user to make a choice between one of two possible mutually
   * exclusive options.
   */
  type: 'checkbox'

  /**
   * Text to display in place of the `label` value on the right side of the
   * checkbox input.
   *
   * Defaults to an empty string (the `label` text is displayed).
   */
  text?: string

  /**
   * The default field value to store when no input is provided.
   *
   * Defaults to `false`.
   */
  default?: boolean
}

export interface CheckboxesField<T extends string | number | symbol = string> extends BaseField {
  /**
   * Displays multiple checkboxes that can be sorted by dragging.
   */
  type: 'checkboxes'

  /**
   * A set of possible selections (options).
   *
   * Defaults to `[]`.
   */
  choices?: {
    /**
     * The choice label displayed in the UI.
     */
    label: string

    /**
     * The choice value stored in the database.
     */
    value: T
  }[]

  /**
   * Determines whether the checkboxes can be rearranged.
   *
   * Defaults to `false`.
   */
  draggable?: boolean

  /**
   * The default field value to store when no input is provided.
   *
   * Defaults to `[]`.
   */
  default?: T[]
}

export interface IconField extends BaseField {
  /**
   * A field for selecting icons stored in the `icons` folder in the Pruvious
   * project directory. The icons must be in SVG format.
   */
  type: 'icon'

  /**
   * Whether to return the SVG code or icon name when the field is populated.
   *
   * Defaults to `'svg'`.
   */
  returnFormat?: 'name' | 'svg'

  /**
   * Allow only specific icons to be selected by providing an array of their
   * filenames (without the extension) from the `icons` folder in the Pruvious
   * project.
   *
   * Defaults to `undefined` (all icons can be selected).
   */
  allow?: string[]

  /**
   * Disallow specific icons from being selected by providing an array of their
   * filenames (without the extension) from the `icons` folder in the Pruvious
   * project.
   *
   * Defaults to `undefined` (no icons are forbidden).
   */
  forbid?: string[]

  /**
   * The default field value to store when no input is provided.
   *
   * Defaults to `null`.
   */
  default?: string | null
}

export interface SizeField<Name extends string = string, Unit extends string = string>
  extends BaseField {
  /**
   * A field that controls named sizes, assigning them a numeric value and unit.
   */
  type: 'size'

  /**
   * A declarative array of size names (e.g. `['paddingTop', 'paddingBottom']`).
   *
   * Defaults to `['width', 'height']`.
   */
  names?: Name[]

  /**
   * A declarative array of size units (e.g. `['px', '%']`).
   *
   * Defaults to `[]`.
   */
  units?: Unit[]

  /**
   * The labels displayed for each size input. If it is not set, the labels
   * will be automatically generated from their size names.
   *
   * Note: The labels are displayed in tooltips when the `inputIcons` property
   * is set.
   *
   * Defaults to `undefined`.
   */
  inputLabels?: Partial<Record<Name, string>>

  /**
   * The icons displayed for each size input. If set, the labels are displayed
   * in tooltips of the icons.
   *
   * Defaults to `undefined`.
   */
  inputIcons?: Partial<Record<Name, Icon>>

  /**
   * The default field value to store when no input is provided.
   *
   * Defaults to `{ width: { value: 0 }, height: { value: 0 } }`.
   */
  default?: Record<Name, Size<Unit>>

  /**
   * Whether the size values can be synchronized in the field UI.
   *
   * Defaults to `false`.
   */
  syncable?: boolean

  /**
   * A minimum acceptable value for the size values. It can be specified for
   * each size separately.
   *
   * Defaults to `undefined` (no minimum).
   */
  min?: number | Partial<Record<Name, number>>

  /**
   * A maximum acceptable value for the size values. It can be specified for
   * each size separately.
   *
   * Defaults to `undefined` (no maximum).
   */
  max?: number | Partial<Record<Name, number>>

  /**
   * A placeholder text to show when the input fields are empty. It can be
   * specified for each size separately.
   *
   * Defaults to `''`.
   */
  placeholder?: string | Partial<Record<Name, string>>
}

interface RegexValidatableField extends CountableField {
  /**
   * A regular expression string that must match the field value (e.g.
   * `^[a-z][a-zA-Z0-9]*$`).
   *
   * Defaults to `undefined`.
   */
  regex?: string

  /**
   * Flags enable features such as global search and case-insensitive search.
   * These flags can be used separately or together in any order, and are
   * included as part of the regular expression.
   *
   * Available flags:
   *
   * - `d` - Generate indices for substring matches (hasIndices)
   * - `g` - Global search (global)
   * - `i` - Case-insensitive search (ignoreCase)
   * - `m` - Allows `^` and `$` to match newline characters (multiline)
   * - `s` - Allows `.` to match newline characters (dotAll)
   * - `u` - Treat a pattern as a sequence of Unicode code points (unicode)
   * - `y` - Perform a "sticky" search that matches starting at the current position in the target string (sticky)
   *
   * Defaults to `undefined`.
   */
  regexFlags?: string

  /**
   * The error message displayed when the field value does not match the
   * specified `regex` pattern.
   *
   * Defauls to `'The value must match the pattern ${regex}'`.
   */
  regexError?: string
}

interface CountableField extends BaseField {
  /**
   * A minimum acceptable value for the field.
   *
   * Defaults to `undefined`.
   */
  min?: number

  /**
   * An acceptable maximum value for the field.
   *
   * Defaults to `undefined`.
   */
  max?: number
}

interface BaseField extends ConditionalField {
  /**
   * A unique field name in camel case.
   */
  name: string

  /**
   * The field type.
   */
  type: string

  /**
   * Text used as the field label in the dashboard. If no value is given, the
   * label will be automatically generated from the `name` property.
   *
   * Defaults to `undefined`.
   */
  label?: string

  /**
   * A short descriptive text, usually displayed in a tooltip in the upper
   * right corner of the field in the dashboard.
   *
   * Defaults to `undefined`.
   */
  description?: string

  /**
   * Determines whether the field value must exist and not be empty.
   *
   * Defaults to `false`.
   */
  required?: boolean

  /**
   * Text to be displayed in the listing table and similar places when the
   * field value is an empty string or `null`.
   *
   * Defaults to `'-'`.
   */
  emptyOrNull?: string

  /**
   * An array of validator names with which to validate the field value. The
   * validators run in the order listed after the standard field validators
   * complete.
   *
   * Defaults to `[]`.
   */
  validate?: string[]

  /**
   * An array of field stubs defined in the `fieldStubs` property of the
   * Pruvious configuration to extend the field. The stubs are applied in the
   * order in which they are specified, overriding previously defined
   * properties. Properties defined in this field are applied last.
   *
   * This property also accepts a single string value for the stub.
   *
   * Defaults to `[]`.
   */
  extend?: string[] | string

  /**
   * Determines whether the field is visible in the dashboard.
   *
   * Defaults to `true`.
   */
  visible?: boolean
}

export interface ConditionalField {
  /**
   * If specified, the field will only appear if the specified conditions are
   * met. The `required` parameter is ignored if the conditions are not met.
   *
   * Defaults to `undefined`.
   */
  condition?: Record<string, Condition> | OrCondition | AndCondition
}

export type Condition =
  | EqCondition
  | EqiCondition
  | NeCondition
  | LtCondition
  | LteCondition
  | GtCondition
  | GteCondition
  | InCondition
  | NotInCondition
  | NullCondition
  | NotNullCondition
  | BetweenCondition
  | StartsWithCondition
  | EndsWithCondition
  | ContainsCondition
  | RegexCondition

/**
 * Check if the field value is equal to something. Objects are compared using
 * `JSON.stringify()`.
 */
export interface EqCondition {
  $eq: string | number | boolean | object
}

/**
 * Check if the field value is equal to a specified string, ignoring case.
 */
export interface EqiCondition {
  $eqi: string
}

/**
 * Check if the field value is not equal to something. Objects are compared
 * using `JSON.stringify()`.
 */
export interface NeCondition {
  $ne: string | number | boolean | object
}

/**
 * Check if the field value is less than a specified number. If the field value
 * is a string or array, its length will be compared.
 */
export interface LtCondition {
  $lt: number
}

/**
 * Check if the field value is less than or equal to a specified number. If the
 * field value is a string or array, its length will be compared.
 */
export interface LteCondition {
  $lte: number
}

/**
 * Check if the field value is greater than a specified number. If the field
 * value is a string or array, its length will be compared.
 */
export interface GtCondition {
  $gt: number
}

/**
 * Check if the field value is greater than or equal to a specified number. If
 * the field value is a string or array, its length will be compared.
 */
export interface GteCondition {
  $gte: number
}

/**
 * Check if the field value is included in a specified array of strings or
 * numbers.
 */
export interface InCondition {
  $in: (string | number)[]
}

/**
 * Check if the field value is not included in a specified array of strings or
 * numbers.
 */
export interface NotInCondition {
  $notIn: (string | number)[]
}

/**
 * Check if the field value is `null`.
 */
export interface NullCondition {
  $null: true
}

/**
 * Check if the field value is not `null`.
 */
export interface NotNullCondition {
  $notNull: true
}

/**
 * Check if the field value is between two numbers specified in a tuple. If the
 * field value is a string or array, its length will be compared.
 */
export interface BetweenCondition {
  $between: [number, number]
}

/**
 * Check if the field value starts with a specified value. If the field value
 * is an array, the first array element is compared
 *
 * Note: This Condition is case-insensitive when comparing strings.
 */
export interface StartsWithCondition {
  $startsWith: string | number | boolean
}

/**
 * Check if the field value ends with a specified value. If the field value
 * is an array, the last array element is compared
 *
 * Note: This Condition is case-insensitive when comparing strings.
 */
export interface EndsWithCondition {
  $endsWith: string | number | boolean
}

/**
 * Check if the field value contains a specified value.
 *
 * Note: This Condition is case-insensitive when comparing strings.
 */
export interface ContainsCondition {
  $contains: string | number | boolean
}

/**
 * Check if the field value matches a specified regular expression.
 *
 * The RegExp can be specified as a string (e.g. `'^[a-z][a-zA-Z0-9]*$'`) or as
 * a tuple where the 2nd element represents the flags (e.g. `['[a-z]+', 'i']`).
 *
 * Flags enable features such as global search and case-insensitive search.
 * These flags can be used separately or together in any order, and are
 * included as part of the regular expression.
 *
 * Available flags:
 *
 * - `d` - Generate indices for substring matches (hasIndices)
 * - `g` - Global search (global)
 * - `i` - Case-insensitive search (ignoreCase)
 * - `m` - Allows `^` and `$` to match newline characters (multiline)
 * - `s` - Allows `.` to match newline characters (dotAll)
 * - `u` - Treat a pattern as a sequence of Unicode code points (unicode)
 * - `y` - Perform a "sticky" search that matches starting at the current position in the target string (sticky)
 */
export interface RegexCondition {
  $regex: string | [string, string]
}

export interface OrCondition {
  /**
   * Joins the conditions in an `or` expression.
   */
  $or: (Record<string, Condition> | OrCondition | AndCondition)[]
}

export interface AndCondition {
  /**
   * Joins the conditions in an `and` expression.
   */
  $and: (Record<string, Condition> | OrCondition | AndCondition)[]
}

/*
|--------------------------------------------------------------------------
| Field groups
|--------------------------------------------------------------------------
|
*/

export type FieldGroup<SubField extends Field = Field> =
  | StackedFieldLayout<SubField>
  | TabbedFieldLayout<SubField>

export interface StackedFieldLayout<SubField extends Field = Field> {
  /**
   * The field type. (@todo short description for each field)
   */
  type: 'stack'

  /**
   * Minimum width of a stacked field (in CSS units, i.e. px, rem, %, etc.).
   *
   * The width can be specified for each field individually by providing an
   * array in which each element (width) is assigned to a field from the
   * `fields` array with the same index (e.g. `['10rem', '20rem', '10rem']`).
   *
   * Use the value `'fill'` to expand a field to the remaining empty space.
   *
   * Defaults to `'10rem'`.
   */
  minFieldWidth?: string | string[]

  /**
   * Fields displayed in this layout.
   */
  fields: SubField[]
}

export interface TabbedFieldLayout<SubField extends Field = Field> {
  /**
   * The field type.
   */
  type: 'tabs'

  /**
   * List of tabs displayed in this field layout.
   */
  tabs: {
    /**
     * Text displayed in the tab button.
     */
    label: string

    /**
     * Fields displayed in this tab.
     */
    fields: (SubField | StackedFieldLayout<SubField>)[]
  }[]
}

/*
|--------------------------------------------------------------------------
| Special fields
|--------------------------------------------------------------------------
|
*/

export interface RedirectionTestField {
  type: 'redirectionTest'
  redirects: Redirect[]
  testValue: string
}

export interface ExtendedTabbedFieldLayout {
  type: 'tabs'
  tabs: {
    label: string
    fields: (Field | StackedFieldLayout | RedirectionTestField)[]
  }[]
}

/*
|--------------------------------------------------------------------------
| Slot
|--------------------------------------------------------------------------
|
*/

export interface Slot<BlockName extends string = string> {
  label?: string
  allowedChildBlocks?: BlockName[] | '*'
}

/*
|--------------------------------------------------------------------------
| Nuxt
|--------------------------------------------------------------------------
|
*/

export interface Image {
  url: string
  alt: string
  width: number | null
  height: number | null
  type: string
  sources: ImageSource[]
}

export interface ImageSource {
  media: string | null
  url: string
  width: number | null
  height: number | null
  type: string
}

export interface Link {
  url: string

  /**
   * A relative path to the linked page.
   *
   * This property is only available for internal links.
   */
  path?: string

  label: string
  target: string | null
}

/*
|--------------------------------------------------------------------------
| Images
|--------------------------------------------------------------------------
|
*/

export type OptimizedImage = OptimizedJpegImage | OptimizedPngImage | OptimizedWebpImage

export interface OptimizedJpegImage extends OptimizedBaseImage {
  format?: 'jpeg'
}

export interface OptimizedPngImage extends OptimizedBaseImage {
  format?: 'png'
}

export interface OptimizedWebpImage extends OptimizedBaseImage {
  format?: 'webp'
  alphaQuality?: IntRange<0, 101>
  lossless?: boolean
  nearLossless?: boolean
  smartSubsample?: boolean
}

interface OptimizedBaseImage {
  media?: string
  format?: string
  width?: number
  height?: number
  resize?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
  position?:
    | 'top'
    | 'topRight'
    | 'right'
    | 'bottomRight'
    | 'bottom'
    | 'bottomLeft'
    | 'left'
    | 'topLeft'
  interpolation?: 'cubic' | 'lanczos2' | 'lanczos3' | 'mitchell' | 'nearest'
  quality?: IntRange<0, 101>
}

export const imageExtensions = [
  'apng',
  'avif',
  'bmp',
  'gif',
  'heif',
  'jpeg',
  'jpg',
  'png',
  'svg',
  'tif',
  'tiff',
  'webp',
]

/*
|--------------------------------------------------------------------------
| Misc
|--------------------------------------------------------------------------
|
*/

type Enumerate<N extends number, Acc extends number[] = []> = Acc['length'] extends N
  ? Acc[number]
  : Enumerate<N, [...Acc, Acc['length']]>

export type IntRange<F extends number, T extends number> = Exclude<Enumerate<T>, Enumerate<F>>

export type CFields<
  InputField extends Record<string, any>,
  CreatablePageField extends keyof InputField,
  RequiredField extends keyof InputField,
> = Pick<InputField, CreatablePageField & RequiredField> &
  Partial<Omit<Pick<InputField, CreatablePageField>, RequiredField>>

export type CDFields<
  InputField extends Record<string, any>,
  CreatablePageField extends keyof InputField,
  RequiredField extends keyof InputField,
  StandardField extends keyof InputField,
> =
  | (Pick<InputField, CreatablePageField & RequiredField> &
      Partial<Omit<Pick<InputField, CreatablePageField>, RequiredField>> & { public: true })
  | (Pick<InputField, CreatablePageField & RequiredField & StandardField> &
      Partial<Omit<Pick<InputField, CreatablePageField>, RequiredField & StandardField>> & {
        public?: false
      })

export type UFields<
  InputField extends Record<string, any>,
  UpdateableField extends keyof InputField,
> = Partial<Pick<InputField, UpdateableField>>

export type SFields<
  PopulatedField extends Record<string, any>,
  InputField extends Record<string, any>,
  SelectableField extends keyof PopulatedField,
> = (
  | Partial<Pick<PopulatedField, SelectableField>>
  | Partial<Pick<InputField, Extract<SelectableField, keyof InputField>>>
) &
  Partial<Pick<PopulatedField, Exclude<SelectableField, keyof InputField>>>

export type FFields<
  PopulatedField extends Record<string, any>,
  FilterableField extends keyof PopulatedField,
> = Partial<Pick<PopulatedField, FilterableField>>

export interface Choice {
  /**
   * The choice label displayed in the UI.
   */
  label: string

  /**
   * The choice stored in the database.
   */
  value: any
}

export type QueryTable = 'pages' | 'presets' | 'uploads' | 'posts' | 'roles' | 'users'

export type ColumnRecords = Record<string, 'string' | 'number' | 'boolean' | 'dateTime' | 'json'>

export interface Pagination {
  currentPage: number
  firstPage: number
  lastPage: number
  perPage: number
  total: number
}

export interface PaginatedResponse<T = unknown> {
  data: T[]
  meta: Pagination
}

export interface ValidationError {
  field: string
  message: string
}

export type ValidationResults =
  | { success: true; data: Record<string, any> }
  | { success: false; errors: ValidationError[] }

export type UpdateResult<T extends Record<string, any>> =
  | { success: true; data: T }
  | { success: false; data: T; errors: ValidationError[] }

export type EditorToolbarItem =
  | 'blockFormats'
  | 'blockquote'
  | 'bold'
  | 'bulletList'
  | 'center'
  | 'clear'
  | 'code'
  | 'codeBlock'
  | 'fullscreen'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'heading4'
  | 'heading5'
  | 'heading6'
  | 'hardBreak'
  | 'highlight'
  | 'horizontalRule'
  | 'inlineFormats'
  | 'italic'
  | 'justify'
  | 'left'
  | 'link'
  | 'normalize'
  | 'orderedList'
  | 'paragraph'
  | 'redo'
  | 'right'
  | 'strike'
  | 'subscript'
  | 'superscript'
  | 'underline'
  | 'undo'

export interface ReturnOptions<T extends string> {
  /**
   * The fields to include in the results.
   * Use a wildcard (*) to return all fields.
   *
   * Defaults to `'*'`.
   */
  fields?: string[] | '*'

  /**
   * Whether to populate the fields.
   *
   * Defaults to `true`.
   */
  populate?: boolean

  /**
   * The relations to include in the results.
   * Use a wildcard (*) to return all relations.
   *
   * Defaults to `'*'`.
   */
  with?: T[] | '*'
}

export interface Redirect {
  match: string
  redirectTo: string
  isRegex: boolean
  code: number
}

export interface Validator {
  /**
   * A unique validator name in camel case.
   */
  name: string

  /**
   * A function to validate a field value. It accepts a single `context`
   * parameter that contains information about the `field`, the input `value`,
   * and the record list in which the field value resides (`data`).
   *
   * If an error is thrown within this function, the field will be marked as
   * invalid and the message provided in the `throw new Error('message...')`
   * statement will be returned in the response.
   *
   * You can modify the field value by using the `data[field.name]` notation.
   */
  callback: (context: {
    /**
     * The record list in which the field value resides.
     */
    data: Record<string, any>

    /**
     * The configuration of the field being validated.
     */
    field: Field

    /**
     * The field value.
     */
    value: any
  }) => Promise<any> | any
}

export interface OAT {
  type: 'bearer'
  token: string
  expires_at: string
}

export interface MetaTag {
  name: string
  content: string
}

export interface Size<Unit extends string = string> {
  value: number
  unit?: Unit
}
