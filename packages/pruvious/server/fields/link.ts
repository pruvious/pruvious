import {
  collections,
  defineField,
  getLinkIndex,
  populateRelURL,
  validateRelURL,
  type LanguageCode,
  type RouteCollectionReferenceName,
} from '#pruvious/server'
import { Field, structuredObjectFieldModel, textFieldModel, type GenericField } from '@pruvious/orm'
import { isArray, isDefined, isNull, isObject, isRelURL, isString, parseRelURL } from '@pruvious/utils'

const validTargets = ['', '_blank', '_self', '_parent', '_top']
const REL_INVALID_CHAR = /[<>"'\x00-\x1f]/

export const VALID_LINK_TARGETS = validTargets

export function isValidRelValue(value: string): boolean {
  return !REL_INVALID_CHAR.test(value)
}

export interface ValidateLinkUrlOptions {
  /**
   * Whether to allow linking to drafts (non-public routes and records).
   *
   * @default true
   */
  allowDrafts?: boolean

  /**
   * Restrict the kinds of internal links this field accepts.
   *
   * @default '*'
   */
  allowedReferences?: '*' | RouteCollectionReferenceName | 'Routes' | (RouteCollectionReferenceName | 'Routes')[]

  /**
   * Whether to allow external URLs (`http://` and `https://`).
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
   * Whether to allow query strings in the URL.
   *
   * @default true
   */
  allowQuery?: boolean
}

/**
 * Validates a link URL string against the supplied restrictions.
 *
 * Returns `null` when the URL is valid, otherwise an error message localised via `context.__`.
 * Handles `rel://` internal links (existence, language availability, draft policy, allowed references)
 * and external `http(s)://` URLs (well-formedness, external-link policy).
 */
export async function validateLinkUrl(
  value: string,
  options: ValidateLinkUrlOptions,
  context: { __: (...args: any[]) => string },
): Promise<string | null> {
  if (!isString(value) || value === '') {
    return null
  }

  if (!(options.allowHash ?? true) && value.includes('#')) {
    return context.__('pruvious-api' as any, 'Hash fragments are not allowed in this field' as any)
  }

  if (!(options.allowQuery ?? true) && value.includes('?')) {
    return context.__('pruvious-api' as any, 'Query strings are not allowed in this field' as any)
  }

  if (isRelURL(value)) {
    const { primaryLanguage } = useRuntimeConfig().pruvious.i18n
    const parsed = parseRelURL(value, primaryLanguage)

    if (!parsed) {
      return context.__('pruvious-api' as any, 'This link is not formatted correctly' as any)
    }

    const relError = validateRelURL(parsed)
    if (relError) {
      if (relError.reason === 'unknown-collection') {
        return context.__(
          'pruvious-api' as any,
          'The collection `$collection` cannot be linked to' as any,
          { collection: relError.collection } as any,
        )
      } else if (relError.reason === 'unsupported-language') {
        return context.__(
          'pruvious-api' as any,
          'The language `$language` is not supported' as any,
          { language: relError.language } as any,
        )
      } else {
        return context.__('pruvious-api' as any, 'This link is not formatted correctly' as any)
      }
    }

    const allowed = options.allowedReferences ?? '*'
    if (allowed !== '*') {
      const list = (isArray(allowed) ? allowed : [allowed]) as (RouteCollectionReferenceName | 'Routes')[]
      const key = (parsed.collection ?? 'Routes') as RouteCollectionReferenceName | 'Routes'

      if (!list.includes(key)) {
        return context.__(
          'pruvious-api' as any,
          'Linking to `$reference` is not allowed in this field' as any,
          { reference: key } as any,
        )
      }
    }

    const effectiveLanguage = parsed.language as LanguageCode
    const allowDrafts = (options.allowDrafts ?? true) as boolean
    const index = await getLinkIndex()
    const route = index.routes.find((r) => r.id === parsed.routeId)

    if (!route) {
      return context.__('pruvious-api' as any, 'Record does not exist' as any)
    }

    const routeIsPublic = route.isPublic[effectiveLanguage] === true

    if (isNull(route.path[effectiveLanguage] ?? null)) {
      return context.__('pruvious-api' as any, 'Route is not available in the specified language' as any)
    }

    if (!routeIsPublic && !allowDrafts) {
      return context.__('pruvious-api' as any, 'Linking to drafts is not allowed in this field' as any)
    }

    // Verify the linked record (if any). Records with a `null` subpath are not routed (no
    // resolvable URL) and are absent from the index, so they are treated as non-existent.
    if (parsed.collection && isDefined(parsed.recordId)) {
      const collection = collections[parsed.collection as keyof typeof collections]! as any
      const translatable = !!collection.meta?.translatable
      const record = (index.records[parsed.collection] ?? []).find((rec) => rec.id === parsed.recordId)

      if (!record) {
        return context.__('pruvious-api' as any, 'Record does not exist' as any)
      }

      const recordIsDraft = !record.isPublic

      if (translatable && record.language !== effectiveLanguage) {
        return context.__(
          'pruvious-api' as any,
          'The linked record is not available in the language `$language`' as any,
          { language: effectiveLanguage } as any,
        )
      }

      if (recordIsDraft && !allowDrafts) {
        return context.__('pruvious-api' as any, 'Linking to drafts is not allowed in this field' as any)
      }
    }

    return null
  }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    if (options.allowExternal === false) {
      return context.__('pruvious-api' as any, 'External links are not allowed in this field' as any)
    }

    try {
      new URL(value)
    } catch {
      return context.__('pruvious-api' as any, 'This is not a valid external URL' as any)
    }

    return null
  }

  return context.__('pruvious-api' as any, 'Only internal and external links are allowed' as any)
}

const subfields: Record<string, GenericField> = {
  url: new Field({
    model: textFieldModel(),
    options: {},
    required: true,
    validators: [
      async (value, { context, path }) => {
        if (!isString(value) || value === '') {
          return
        }

        let parentField: any = null
        let nextFields: any = context.collection?.fields
        for (const segment of path.split('.').slice(0, -1)) {
          if (/^\d+$/.test(segment)) {
            continue
          }
          parentField = nextFields?.[segment]
          if (!parentField) {
            break
          }
          nextFields = parentField.model?.subfields
        }
        const parentOpts: ValidateLinkUrlOptions = parentField?.options ?? {}
        const error = await validateLinkUrl(value, parentOpts, context)

        if (error) {
          throw new Error(error)
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
          throw new Error(context.__('pruvious-api' as any, 'Invalid link target' as any))
        }
      },
    ],
  }) as any,
  rel: new Field({
    model: textFieldModel(),
    options: {},
    validators: [
      (value, { context }) => {
        if (isString(value) && !isValidRelValue(value)) {
          throw new Error(context.__('pruvious-api' as any, 'The `rel` value contains invalid characters' as any))
        }
      },
    ],
  }) as any,
}

const customOptions: {
  /**
   * Whether to allow linking to drafts (non-public routes and records).
   *
   * When `false`, links to drafts are rejected. Affects `rel://` URLs only.
   *
   * @default true
   */
  allowDrafts?: boolean

  /**
   * Restrict the kinds of links this field accepts. Affects `rel://` URLs only; external URLs are gated separately via `allowExternal`.
   *
   * - `'*'` (default) - all routable collections and bare-route links are allowed.
   * - A collection name (e.g. `'Articles'`) - only `rel://Routes:{id}/{Collection}:{recordId}` links to that collection.
   * - `'Routes'` - only bare `rel://Routes:{id}` links (singletons, redirects, reference-less routes).
   * - An array - any of the listed kinds is allowed.
   *
   * @default '*'
   */
  allowedReferences?: '*' | RouteCollectionReferenceName | 'Routes' | (RouteCollectionReferenceName | 'Routes')[]

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
   * Whether to allow query strings in the URL.
   *
   * @default true
   */
  allowQuery?: boolean

  ui?: {
    /**
     * Specifies which languages to show when selecting links.
     *
     * @default 'current'
     */
    languages?: 'all' | 'current' | LanguageCode[]

    /**
     * Whether to show the `target` attribute field in the dashboard link picker.
     *
     * @default true
     */
    showTarget?: boolean

    /**
     * Whether to show the `rel` attribute field in the dashboard link picker.
     *
     * @default true
     */
    showRel?: boolean
  }
} = {
  allowDrafts: true,
  allowedReferences: '*',
  allowExternal: true,
  allowHash: true,
  allowQuery: true,
  ui: {
    languages: 'current',
    showTarget: true,
    showRel: true,
  },
}

interface LinkFieldCastedValue {
  /**
   * The link URL.
   *
   * Internal links use the `rel://` protocol (e.g., `rel://Routes:1/Articles:5@en`).
   * External links use standard URL protocols (e.g., `https://example.com`).
   */
  url: string

  /**
   * The `target` attribute for the link (e.g., `'_blank'`, `'_self'`, or `''`).
   */
  target: (typeof validTargets)[number]

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
  target: (typeof validTargets)[number]

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
  uiOptions: { placeholder: true },
  populator: async (value) => {
    if (!isObject(value) || !isString(value.url) || !value.url) {
      return null
    }

    const resolved = await populateRelURL(value.url)

    return {
      url: resolved || undefined,
      target: value.target ?? '',
      rel: value.rel ?? '',
    }
  },
})
