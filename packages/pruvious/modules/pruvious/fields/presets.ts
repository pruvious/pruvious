import {
  languageField,
  primaryLanguage,
  recordField,
  recordsField,
  timestampField,
  translationsField,
  type FieldUIOptions,
  type Permission,
  type TranslatableStringCallbackContext,
} from '#pruvious/server'
import { createdAtFieldBeforeQueryExecution, updatedAtFieldBeforeQueryExecution } from '@pruvious/orm'
import { defu, isUndefined, kebabCase, nanoid, type OmitUndefined } from '@pruvious/utils'
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
  ui?: OmitUndefined<FieldUIOptions<true, true, true, true, true, true, true>>
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
  ui?: OmitUndefined<FieldUIOptions<true, true, true, true, true, true, true>>
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
  ui?: OmitUndefined<FieldUIOptions<true, true, true, true, true, true, true>> & TimestampFieldOptions['ui']
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
  ui?: OmitUndefined<FieldUIOptions<true, true, true, true, true, true, true>> & TimestampFieldOptions['ui']
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
  ui?: OmitUndefined<FieldUIOptions<true, true, true, false, true, true, true>>
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
  ui?: OmitUndefined<FieldUIOptions<true, true, true, false, true, true, true>>
}

/**
 * Generates a `language` field that stores the language code of a record.
 */
export function languageFieldPreset(options: LanguageFieldPresetOptions) {
  return languageField({
    required: true,
    immutable: true,
    default: primaryLanguage,
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
