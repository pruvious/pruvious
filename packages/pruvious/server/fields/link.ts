import { defineField, normalizeRoutePath, selectFrom, type LanguageCode } from '#pruvious/server'
import { Field, structuredObjectFieldModel, textFieldModel, type GenericField } from '@pruvious/orm'
import { isNull, isRelURL, isString, parseRelURL } from '@pruvious/utils'

const validTargets = ['', '_blank', '_self', '_parent', '_top']

const subfields: Record<string, GenericField> = {
  url: new Field({
    model: textFieldModel(),
    options: {},
    required: true,
    validators: [
      async (value, { context }) => {
        if (!isString(value) || value === '') {
          return
        }

        if (isRelURL(value)) {
          const parsed = parseRelURL(value)

          if (!parsed) {
            throw new Error(context.__('pruvious-api' as any, 'Invalid input'))
          }

          // Verify route exists
          const routeCount = await context.database
            .queryBuilder()
            .selectFrom('Routes')
            .where('id', '=', parsed.routeId)
            .useCache(context.cache)
            .count()

          if (!routeCount.success || routeCount.data === 0) {
            throw new Error(context.__('pruvious-api' as any, 'Record does not exist' as any))
          }

          // Verify record exists (if collection link)
          if (parsed.collection && parsed.recordId !== undefined) {
            const recordCount = await context.database
              .queryBuilder()
              .selectFrom(parsed.collection)
              .where('id', '=', parsed.recordId)
              .useCache(context.cache)
              .count()

            if (!recordCount.success || recordCount.data === 0) {
              throw new Error(context.__('pruvious-api' as any, 'Record does not exist' as any))
            }
          }
        } else if (value.startsWith('http://') || value.startsWith('https://')) {
          try {
            new URL(value)
          } catch {
            throw new Error(context.__('pruvious-api' as any, 'Invalid input'))
          }
        } else {
          throw new Error(context.__('pruvious-api' as any, 'Invalid input'))
        }
      },
    ],
  }) as any,
  target: new Field({
    model: textFieldModel(),
    options: {},
    validators: [
      (value, { context }) => {
        if (isString(value) && !validTargets.includes(value)) {
          throw new Error(context.__('pruvious-api' as any, 'Invalid input'))
        }
      },
    ],
  }) as any,
  rel: new Field({
    model: textFieldModel(),
    options: {},
  }) as any,
}

const customOptions: {
  /**
   * Restrict selectable links to specific route reference names (collection or singleton names).
   * When `undefined`, all routable collections and singletons are available.
   *
   * @default undefined
   */
  allowedReferences?: string[]

  /**
   * Whether to allow external URLs (http:// and https://).
   *
   * @default true
   */
  allowExternal?: boolean

  /**
   * Whether to allow hash fragments in the URL.
   *
   * @default true
   */
  allowHash?: boolean

  /**
   * Whether to show `target` and `rel` attribute fields.
   *
   * @default true
   */
  allowAttributes?: boolean
} = {
  allowedReferences: undefined,
  allowExternal: true,
  allowHash: true,
  allowAttributes: true,
}

interface LinkFieldCastedValue {
  /**
   * The link URL.
   *
   * Internal links use the `rel://` protocol (e.g., `rel://Routes:1/Articles:5`).
   * External links use standard URL protocols (e.g., `https://example.com`).
   */
  url: string

  /**
   * The `target` attribute for the link (e.g., `'_blank'`, `'_self'`, or `''`).
   */
  target: string

  /**
   * The `rel` attribute for the link (e.g., `'noopener nofollow'` or `''`).
   */
  rel: string
}

interface LinkFieldPopulatedValue {
  /**
   * The resolved URL path (e.g., `/blog/my-article`), external URL, or `undefined` if the link is broken.
   */
  url: string | undefined

  /**
   * The `target` attribute for the link (e.g., `'_blank'`, `'_self'`, or `''`).
   */
  target: string

  /**
   * The `rel` attribute for the link (e.g., `'noopener nofollow'` or `''`).
   */
  rel: string
}

export default defineField({
  model: structuredObjectFieldModel<typeof subfields, LinkFieldCastedValue | null, LinkFieldPopulatedValue | null>(
    subfields,
  ),
  nullable: true,
  default: null,
  customOptions,
  validators: [
    (value, { definition, context }) => {
      if (isNull(value) || !isString(value.url) || value.url === '') {
        return
      }

      const url = value.url as string

      if (!(definition.options.allowHash ?? true) && url.includes('#')) {
        throw new Error(context.__('pruvious-api', 'Invalid input'))
      }

      if (!(definition.options.allowExternal ?? true) && !isRelURL(url)) {
        throw new Error(context.__('pruvious-api', 'Invalid input'))
      }

      if (definition.options.allowedReferences?.length && isRelURL(url)) {
        const parsed = parseRelURL(url)

        if (parsed?.collection && !definition.options.allowedReferences.includes(parsed.collection)) {
          throw new Error(context.__('pruvious-api', 'Invalid input'))
        }
      }
    },
  ],
  populator: async (value, contextField) => {
    if (isNull(value)) {
      return null
    }

    const { context } = contextField
    const url = value.url as string

    if (!isRelURL(url)) {
      // External URL or empty: pass through as-is
      return {
        url: url || undefined,
        target: value.target ?? '',
        rel: value.rel ?? '',
      }
    }

    const parsed = parseRelURL(url)

    if (!parsed) {
      return { url: undefined, target: value.target ?? '', rel: value.rel ?? '' }
    }

    const language = (context.customData?.language ?? useRuntimeConfig().pruvious.i18n.primaryLanguage) as LanguageCode
    const languageSuffix = language.toUpperCase()
    const { primaryLanguage, prefixPrimaryLanguage } = useRuntimeConfig().pruvious.i18n
    const languagePrefix = language !== primaryLanguage || prefixPrimaryLanguage ? `/${language}` : ''

    // Look up the route base path
    const route = await selectFrom('Routes').selectRaw(`path${languageSuffix}`).where('id', '=', parsed.routeId).first()

    if (!route.success || !route.data) {
      return { url: undefined, target: value.target ?? '', rel: value.rel ?? '' }
    }

    const basePath = route.data[`path${languageSuffix}` as keyof typeof route.data] as string | null

    if (!basePath) {
      return { url: undefined, target: value.target ?? '', rel: value.rel ?? '' }
    }

    let resolvedPath: string

    if (parsed.collection && parsed.recordId !== undefined) {
      // Collection record: look up subpath
      const record = await (selectFrom as any)(parsed.collection)
        .selectRaw('subpath')
        .where('id', '=', parsed.recordId)
        .first()

      if (!record.success || !record.data) {
        return { url: undefined, target: value.target ?? '', rel: value.rel ?? '' }
      }

      resolvedPath = normalizeRoutePath(`${languagePrefix}/${basePath}/${record.data.subpath}`)
    } else {
      // Singleton route
      resolvedPath = normalizeRoutePath(`${languagePrefix}${basePath}`)
    }

    // Append query and hash
    const querySuffix = parsed.query ? `?${parsed.query}` : ''
    const hashSuffix = parsed.hash ? `#${parsed.hash}` : ''

    return {
      url: resolvedPath + querySuffix + hashSuffix,
      target: value.target ?? '',
      rel: value.rel ?? '',
    }
  },
})
