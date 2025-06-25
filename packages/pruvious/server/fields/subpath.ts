import { defineField, uniqueValidator } from '#pruvious/server'
import { textFieldModel } from '@pruvious/orm'
import { isNotNull, isString, withoutLeadingSlash, withoutTrailingSlash } from '@pruvious/utils'
import type { nullableTextOptions } from './nullableText'

const customOptions: {
  /**
   * Controls whether the subpath can include forward slashes (`/`).
   *
   * When set to `true`, subpaths can create nested URL structures like `2025-06-15/article-title`.
   * When `false`, forward slashes are not allowed in the subpath.
   *
   * @default false
   */
  allowNesting?: boolean

  /**
   * When set to `true`, the subpath will be automatically converted to lowercase.
   *
   * @default false
   */
  forceLowercase?: boolean
} & typeof nullableTextOptions = {
  allowNesting: false,
  forceLowercase: false,
  ui: {
    dataTable: {
      hyphenate: true,
      truncate: { lines: 1 },
    },
    switch: {
      offLabel: ({ __ }) => __('pruvious-dashboard', 'Off'),
      onLabel: ({ __ }) => __('pruvious-dashboard', 'On'),
      variant: 'accent',
    },
  },
}

export default defineField({
  model: textFieldModel(),
  nullable: true,
  default: null,
  sanitizers: [
    (value) => {
      if (isString(value)) {
        return withoutLeadingSlash(withoutTrailingSlash(value.replace(/\s+/g, '-').replace(/\/+/g, '/')))
      }
      return value
    },
    (value, { definition }) => {
      if (isString(value) && definition.options.forceLowercase) {
        return value.toLowerCase()
      }
      return value
    },
  ],
  validators: [
    async (value, sanitizedContextField, errors) => {
      if (isNotNull(value)) {
        const { pathValidator } = await import('#pruvious/server')
        await pathValidator()(`/${value}`, sanitizedContextField, errors)
      }
    },
    (value, { context, definition }) => {
      if (isNotNull(value) && !definition.options.allowNesting && value.includes('/')) {
        throw new Error(
          context.__(
            'pruvious-dashboard',
            'Nested subpaths with forward slashes (`/`) are not allowed in this collection',
          ),
        )
      }
    },
    uniqueValidator({
      perLanguage: true,
      caseSensitive: false,
      errorMessage: ({ __ }) => __('pruvious-dashboard', 'This subpath is already in use.'),
    }),
  ],
  customOptions,
  uiOptions: { placeholder: true },
  omitOptions: ['trim'],
})
