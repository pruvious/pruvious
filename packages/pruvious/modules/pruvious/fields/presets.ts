import {
  dateTimeField,
  languageField,
  objectField,
  primaryLanguage,
  recordField,
  recordsField,
  subpathField,
  textField,
  timestampField,
  translationsField,
  trueFalseField,
  type FieldUIOptions,
  type Permission,
  type TranslatableStringCallbackContext,
} from '#pruvious/server'
import { createdAtFieldBeforeQueryExecution, updatedAtFieldBeforeQueryExecution } from '@pruvious/orm'
import { defu, isNull, isString, isUndefined, kebabCase, nanoid, type OmitUndefined } from '@pruvious/utils'
import type { TimestampFieldOptions } from '../../../server/fields/timestamp'

export interface LanguageFieldPresetOptions {
  /**
   * The UI options for the field.
   *
   * @default
   * {
   *   hidden: true,
   *   label: ({ __ }) => __('pruvious-dashboard', 'Language'),
   *   description: ({ __ }) => __('pruvious-dashboard', 'The content language.'),
   * }
   */
  ui?: OmitUndefined<FieldUIOptions<true, true, true, true, true, true, true, true>>
}

export interface TranslationsFieldPresetOptions {
  /**
   * The UI options for the field.
   *
   * @default
   * {
   *   hidden: true,
   *   label: ({ __ }) => __('pruvious-dashboard', 'Translations'),
   *   description: ({ __ }) => __('pruvious-dashboard', 'The unique identifier for translations.'),
   * }
   */
  ui?: OmitUndefined<FieldUIOptions<true, true, true, true, true, true, true, true>>
}

export interface CreatedAtFieldPresetOptions {
  /**
   * The UI options for the field.
   *
   * @default
   * {
   *   hidden: true,
   *   label: ({ __ }) => __('pruvious-dashboard', 'Created'),
   *   description: ({ __ }) => __('pruvious-dashboard', 'The date and time when the record was created.'),
   * }
   */
  ui?: OmitUndefined<FieldUIOptions<true, true, true, true, true, true, true, true>> & TimestampFieldOptions['ui']
}

export interface UpdatedAtFieldPresetOptions {
  /**
   * The UI options for the field.
   *
   * @default
   * {
   *   hidden: true,
   *   label: ({ __ }) => __('pruvious-dashboard', 'Updated'),
   *   description: ({ __ }) => __('pruvious-dashboard', 'The date and time when the record was last updated.'),
   * }
   */
  ui?: OmitUndefined<FieldUIOptions<true, true, true, true, true, true, true, true>> & TimestampFieldOptions['ui']
}

export interface AuthorFieldPresetOptions {
  /**
   * Controls whether authors are restricted to reading only their own records.
   * By default, they can read all records.
   *
   * @default false
   */
  strict?: boolean

  /**
   * The UI options for the field.
   *
   * @default
   * {
   *   label: ({ __ }) => __('pruvious-dashboard', 'Author'),
   *   description: ({ __ }) => __('pruvious-dashboard', 'The user who created the record.'),
   * }
   */
  ui?: OmitUndefined<FieldUIOptions<true, true, true, false, true, true, true, true>>
}

export interface EditorsFieldPresetOptions {
  /**
   * Controls whether editors are restricted to reading only the records they are assigned to.
   * By default, they can read all records.
   *
   * @default false
   */
  strict?: boolean

  /**
   * The UI options for the field.
   *
   * @default
   * {
   *   label: ({ __ }) => __('pruvious-dashboard', 'Editors'),
   *   description: ({ __ }) => __('pruvious-dashboard', 'The users who can edit the record.'),
   * }
   */
  ui?: OmitUndefined<FieldUIOptions<true, true, true, false, true, true, true, true>>
}

export type SubpathFieldPresetOptions = Parameters<typeof subpathField>[0] & {
  /**
   * The UI options for the field.
   *
   * @default
   * {
   *   label: ({ __ }) => __('pruvious-dashboard', 'Subpath'),
   *   description: ({ __ }) => __('pruvious-dashboard', 'The last part of the URL path after the base URL.'),
   *   placeholder: ({ __ }) => __('pruvious-dashboard', 'unique-subpath'),
   * }
   */
  ui?: OmitUndefined<FieldUIOptions<true, true, true, true, true, true, true, true>>
}

export type IsPublicFieldPresetOptions = Parameters<typeof trueFalseField>[0] & {
  /**
   * The UI options for the field.
   *
   * @default
   * {
   *   label: ({ __ }) => __('pruvious-dashboard', 'Status'),
   *   description: ({ __ }) => __('pruvious-dashboard', 'Indicates whether this route is publicly accessible.'),
   *   noLabel: ({ __ }) => __('pruvious-dashboard', 'Draft'),
   *   yesLabel: ({ __ }) => __('pruvious-dashboard', 'Public'),
   * }
   */
  ui?: OmitUndefined<FieldUIOptions<true, true, true, true, true, true, true, true>>
}

export type ScheduledAtFieldPresetOptions = Parameters<typeof dateTimeField>[0] & {
  /**
   * The UI options for the field.
   *
   * @default
   * {
   *   label: ({ __ }) => __('pruvious-dashboard', 'Publish date'),
   *   description: ({ __ }) => __('pruvious-dashboard', 'Sets when this content will be published. Use current date and time for immediate publication or a future date to schedule it.'),
   * }
   */
  ui?: OmitUndefined<FieldUIOptions<true, true, true, true, true, true, true, true>>
}

export type SEOFieldPresetOptions = Omit<Parameters<typeof objectField>[0], 'subfields'> & {
  /**
   * The UI options for the field.
   *
   * @default
   * {
   *   label: ({ __ }) => __('pruvious-dashboard', 'SEO'),
   *   subfieldsLayout: [
   *     {
   *       tabs: [
   *         {
   *           label: ({ __ }) => __('pruvious-dashboard', 'General'),
   *           fields: ['title', 'baseTitle', 'description', 'isIndexable'],
   *         },
   *       ],
   *     },
   *   ],
   * }
   */
  ui?: OmitUndefined<FieldUIOptions<true, true, true, false, true, true, true, true>>
}

/**
 * Generates a `language` field that stores the language code of a record.
 */
export function languageFieldPreset(options: LanguageFieldPresetOptions) {
  return languageField({
    required: true,
    immutable: true,
    default: primaryLanguage,
    validators: [
      (value, { context }) => {
        if (isNull(value)) {
          throw new Error(context.__('pruvious-orm', 'This field is required'))
        }
      },
    ],
    ui: defu(options.ui ?? {}, {
      hidden: true,
      label: ({ __ }: TranslatableStringCallbackContext) => __('pruvious-dashboard', 'Language'),
      description: ({ __ }: TranslatableStringCallbackContext) => __('pruvious-dashboard', 'The content language.'),
    } satisfies LanguageFieldPresetOptions['ui']),
  })
}

/**
 * Generates a `translations` field that creates and stores a unique identifier connecting records across multiple language versions.
 * This field enables linking and managing translations of the same content in different languages.
 * The populated field value is an object with language codes as keys and translation record IDs as values.
 */
export function translationsFieldPreset(options: TranslationsFieldPresetOptions) {
  return translationsField({
    immutable: true,
    inputFilters: {
      beforeQueryExecution: (value, { context }) => (context.operation === 'insert' ? (value ?? nanoid()) : undefined),
    },
    ui: defu(options.ui ?? {}, {
      hidden: true,
      label: ({ __ }: TranslatableStringCallbackContext) => __('pruvious-dashboard', 'Translations'),
      description: ({ __ }: TranslatableStringCallbackContext) =>
        __('pruvious-dashboard', 'The unique identifier for translations.'),
    } satisfies TranslationsFieldPresetOptions['ui']),
  })
}

/**
 * Generates a `createdAt` field that stores the timestamp of when a record was created.
 */
export function createdAtFieldPreset(options: CreatedAtFieldPresetOptions) {
  return timestampField({
    immutable: true,
    autoGenerated: true,
    inputFilters: {
      beforeQueryExecution: createdAtFieldBeforeQueryExecution,
    },
    ui: defu(options.ui ?? {}, {
      hidden: true,
      label: ({ __ }: TranslatableStringCallbackContext) => __('pruvious-dashboard', 'Created'),
      description: ({ __ }: TranslatableStringCallbackContext) =>
        __('pruvious-dashboard', 'The date and time when the record was created.'),
      relativeTime: true,
    } satisfies CreatedAtFieldPresetOptions['ui']),
  })
}

/**
 * Generates an `updatedAt` field that stores the timestamp of when a record was last updated.
 */
export function updatedAtFieldPreset(options: UpdatedAtFieldPresetOptions) {
  return timestampField({
    autoGenerated: true,
    inputFilters: {
      beforeQueryExecution: updatedAtFieldBeforeQueryExecution,
    },
    ui: defu(options.ui ?? {}, {
      hidden: true,
      label: ({ __ }: TranslatableStringCallbackContext) => __('pruvious-dashboard', 'Updated'),
      description: ({ __ }: TranslatableStringCallbackContext) =>
        __('pruvious-dashboard', 'The date and time when the record was last updated.'),
      relativeTime: true,
    } satisfies UpdatedAtFieldPresetOptions['ui']),
  })
}

/**
 * Generates an `author` field that stores the ID of the user who created a record.
 */
export function authorFieldPreset(options: AuthorFieldPresetOptions) {
  return recordField({
    collection: 'Users',
    fields: ['id', 'firstName', 'lastName'],
    validators: [
      async (value, { context, path, isSubfield }) => {
        if (context.customData._guarded && context.operation === 'update' && !isSubfield) {
          const { auth } = useEvent().context.pruvious

          if (
            auth.isLoggedIn &&
            !auth.permissions.includes(`collection:${kebabCase(context.collectionName!)}:manage` as Permission)
          ) {
            const query = await context.database
              .queryBuilder()
              .selectFrom(context.collectionName!)
              .select(path)
              .setWhereCondition(context.whereCondition)
              .useCache(context.cache)
              .groupBy(path)
              .all()

            if (!query.success || query.data.some(({ [path]: author }) => author !== auth.user.id)) {
              return undefined
            }
          }
        }

        return value
      },
    ],
    inputFilters: {
      beforeInputSanitization: (value, { context }) => {
        if (context.customData._guarded && context.operation === 'insert' && isUndefined(value)) {
          const { isLoggedIn, user } = useEvent().context.pruvious.auth
          return isLoggedIn ? user.id : null
        }

        return value
      },
    },
    ui: defu(options.ui ?? {}, {
      label: ({ __ }: TranslatableStringCallbackContext) => __('pruvious-dashboard', 'Author'),
      description: ({ __ }: TranslatableStringCallbackContext) =>
        __('pruvious-dashboard', 'The user who created the record.'),
    } satisfies AuthorFieldPresetOptions['ui']),
  })
}

/**
 * Generates an `editors` field that stores the IDs of the users who can edit a collection record.
 */
export function editorsFieldPreset(options: EditorsFieldPresetOptions) {
  return recordsField({
    collection: 'Users',
    fields: ['id', 'firstName', 'lastName'],
    ui: defu(options.ui ?? {}, {
      label: ({ __ }: TranslatableStringCallbackContext) => __('pruvious-dashboard', 'Editors'),
      description: ({ __ }: TranslatableStringCallbackContext) =>
        __('pruvious-dashboard', 'The users who can edit the record.'),
    } satisfies EditorsFieldPresetOptions['ui']),
  })
}

/**
 * Generates a `subpath` field that stores the last portion of a URL path.
 * This field is intended to be used in collections referenced by routes.
 */
export function subpathFieldPreset(options: SubpathFieldPresetOptions) {
  return subpathField({
    required: true,
    ...options,
    ui: defu(options.ui ?? {}, {
      label: ({ __ }: TranslatableStringCallbackContext) => __('pruvious-dashboard', 'Subpath'),
      description: ({ __ }: TranslatableStringCallbackContext) =>
        __('pruvious-dashboard', 'The last part of the URL path after the base URL.'),
      placeholder: ({ __ }: TranslatableStringCallbackContext) => __('pruvious-dashboard', 'unique-subpath'),
    } satisfies SubpathFieldPresetOptions['ui']),
  })
}

/**
 * Generates an `isPublic` field that stores a boolean value indicating whether a routed collection record is public.
 * This field is intended to be used in collections referenced by routes.
 */
export function isPublicFieldPreset(options: IsPublicFieldPresetOptions) {
  return trueFalseField({
    default: true,
    ...options,
    ui: defu(options.ui ?? {}, {
      label: ({ __ }: TranslatableStringCallbackContext) => __('pruvious-dashboard', 'Status'),
      description: ({ __ }: TranslatableStringCallbackContext) =>
        __('pruvious-dashboard', 'Indicates whether this route is publicly accessible.'),
      noLabel: ({ __ }: TranslatableStringCallbackContext) => __('pruvious-dashboard', 'Draft'),
      yesLabel: ({ __ }: TranslatableStringCallbackContext) => __('pruvious-dashboard', 'Public'),
    } satisfies IsPublicFieldPresetOptions['ui']),
  })
}

/**
 * Generates an `scheduledAt` field that stores a timestamp indicating when a routed collection record is scheduled to be published.
 * This field is intended to be used in collections referenced by routes and requires the `isPublic` field to be present.
 */
export function scheduledAtFieldPreset(options: ScheduledAtFieldPresetOptions) {
  return dateTimeField({
    ...options,
    ui: defu(options.ui ?? {}, {
      label: ({ __ }: TranslatableStringCallbackContext) => __('pruvious-dashboard', 'Publish date'),
      description: ({ __ }: TranslatableStringCallbackContext) =>
        __(
          'pruvious-dashboard',
          'Sets when the route will be published. Use current date and time for immediate publication or a future date to schedule it.',
        ),
    } satisfies ScheduledAtFieldPresetOptions['ui']),
  })
}

/**
 * Generates an `seo` field that contains metadata for search engine optimization.
 * This field is intended to be used in collections referenced by routes.
 */
export function seoFieldPreset(options: SEOFieldPresetOptions) {
  return objectField({
    ...(options as {}),
    subfields: {
      title: textField({
        sanitizers: [(value) => (isString(value) ? value.replace(/\s+/g, ' ') : value)],
        ui: {
          label: ({ __ }) => __('pruvious-dashboard', 'Page title'),
          description: ({ __ }) =>
            __(
              'pruvious-dashboard',
              'The title of the page displayed in search results and browser tabs. Search engines typically display about the first 55-60 characters of a page title. Text beyond that may be lost, so try not to have titles longer than that.',
            ),
          placeholder: ({ __ }) => __('pruvious-dashboard', 'Untitled'),
        },
      }),
      baseTitle: trueFalseField({
        default: true,
        ui: {
          yesLabel: ({ __ }) => __('pruvious-dashboard', 'Show'),
          noLabel: ({ __ }) => __('pruvious-dashboard', 'Hide'),
          label: ({ __ }) => __('pruvious-dashboard', 'Base title'),
          description: ({ __ }) =>
            __(
              'pruvious-dashboard',
              'Controls whether to combine the page title with the base title defined in the SEO settings.',
            ),
        },
      }),
      // @todo textAreaField
      description: textField({
        sanitizers: [(value) => (isString(value) ? value.replace(/\s+/g, ' ') : value)],
        ui: {
          label: ({ __ }) => __('pruvious-dashboard', 'Meta description'),
          description: ({ __ }) =>
            __(
              'pruvious-dashboard',
              'A brief description of the page content, typically displayed in search results. Search engines usually show about 150-160 characters of this text.',
            ),
          placeholder: ({ __ }) => __('pruvious-dashboard', 'No description'),
        },
      }),
      isIndexable: trueFalseField({
        default: true,
        ui: {
          label: ({ __ }) => __('pruvious-dashboard', 'Search engine visibility'),
          yesLabel: ({ __ }) => __('pruvious-dashboard', 'Visible'),
          noLabel: ({ __ }) => __('pruvious-dashboard', 'Hidden'),
          description: ({ __ }) =>
            __('pruvious-dashboard', 'Controls whether search engines are allowed to index this page.'),
        },
      }),
      // @todo sharingImage
      // @todo metaTags
    },
    ui: defu((options.ui as any) ?? {}, {
      label: ({ __ }: TranslatableStringCallbackContext) => __('pruvious-dashboard', 'SEO'),
      subfieldsLayout: [
        {
          tabs: [
            {
              label: ({ __ }) => __('pruvious-dashboard', 'General'),
              fields: ['title', 'baseTitle', 'description', 'isIndexable'],
            },
          ],
        },
      ],
    } satisfies SEOFieldPresetOptions['ui']),
  })
}
