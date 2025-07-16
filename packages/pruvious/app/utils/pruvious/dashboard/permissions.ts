import { languages } from '#pruvious/client/i18n'
import type { Collections, LanguageCode, Permission, SerializableCollection } from '#pruvious/server'
import { clear, isNumber, isUndefined, kebabCase } from '@pruvious/utils'
import { getUser, hasPermission } from '../../../../modules/pruvious/auth/utils.client'
import { selectFrom } from '../../../../modules/pruvious/client-query-builder/utils.client'

export interface ResolvedCollectionRecordPermissions {
  /**
   * The current record ID.
   */
  id: number | null

  /**
   * Whether the current user can create new collection records.
   */
  canCreate: boolean

  /**
   * Whether the current user has permission to read a record by its `id`.
   * Checks the `author` and `editors` fields (if enabled in the collection) to verify read rights.
   */
  canRead: boolean

  /**
   * Whether the current user has permission to update a record by its `id`.
   * Checks `author` and `editors` fields (if enabled in the collection) to verify update rights.
   */
  canUpdate: boolean

  /**
   * Whether the current user has permission to delete a record by its `id`.
   * Checks the `author` field (if enabled in the collection) to verify delete rights.
   */
  canDelete: boolean
}

export type ResolvedTranslatableCollectionRecordPermissions = Record<LanguageCode, ResolvedCollectionRecordPermissions>

export type CollectionRecordPermissionsResolver = (
  id: number,
  additionalFieldValues?: { author?: number | null; editors?: number[] },
) => Promise<ResolvedCollectionRecordPermissions>

/**
 * Resolves user permissions for a specific `collection` record identified by its `id`.
 * Requires the authenticated user to have read access to the record.
 *
 * You can provide the `author` and `editor` values (if enabled in the `collection.definition`)
 * as the third parameter to avoid making an API call to fetch this information.
 *
 * @example
 * ```ts
 * await resolveCollectionRecordPermissions(1, collection)
 * // { id: 1, canCreate: true, canRead: true, canUpdate: true, canDelete: true }
 * ```
 */
export async function resolveCollectionRecordPermissions(
  id: number,
  collection: { name: keyof Collections; definition: SerializableCollection },
  additionalFieldValues?: { author?: number | null; editors?: number[] },
): Promise<ResolvedCollectionRecordPermissions> {
  const isManaged = collection.definition.authorField || collection.definition.editorsField
  const canManage = hasPermission(`collection:${kebabCase(collection.name)}:manage` as Permission)
  const canCreate = hasPermission(`collection:${kebabCase(collection.name)}:create` as Permission)
  const canUpdate = hasPermission(`collection:${kebabCase(collection.name)}:update` as Permission)
  const canDelete = hasPermission(`collection:${kebabCase(collection.name)}:delete` as Permission)
  const results: ResolvedCollectionRecordPermissions = {
    id,
    canCreate,
    canRead: !isManaged || canManage,
    canUpdate: canUpdate && (!isManaged || canManage),
    canDelete: canDelete && (!isManaged || canManage),
  }

  if (isManaged && !canManage && (canUpdate || canDelete)) {
    const userId = getUser()?.id!

    let _canUpdate = false
    let _canDelete = false
    let author = additionalFieldValues?.author
    let editors = additionalFieldValues?.editors

    const select: any = [
      collection.definition.authorField && isUndefined(author) ? 'author' : null,
      collection.definition.editorsField && isUndefined(editors) ? 'editors' : null,
    ].filter(Boolean)

    if (select.length) {
      await selectFrom(collection.name)
        .select(select)
        .where('id', '=', id)
        .first()
        .then(({ data }) => {
          results.canRead = !!data

          if (select.includes('author')) {
            author = data?.author
          }

          if (select.includes('editors')) {
            editors = data?.editors
          }
        })
    }

    if (collection.definition.authorField) {
      _canUpdate = author === userId
      _canDelete = author === userId
    }

    if (collection.definition.editorsField) {
      _canUpdate ||= !!editors?.includes(userId)
    }

    results.canUpdate = canUpdate && _canUpdate
    results.canDelete = canDelete && _canDelete
  }

  return results
}

/**
 * Resolves user permissions for all defined languages of a `collection` record identified by its `id`.
 * Requires the authenticated user to have read access to the base record.
 *
 * @returns a key-value object with language codes as keys and resolved permissions as values.
 *          If the `collection` is not translatable, the resolved permissions will be the same for all languages.
 *
 * @example
 * ```ts
 * await resolveTranslatableCollectionRecordPermissions(1, translatableCollection)
 * // {
 * //   en: { id: 1, canCreate: true, canRead: true, canUpdate: true, canDelete: true },
 * //   de: { id: null, canCreate: true, canRead: true, canUpdate: true, canDelete: true },
 * //   fr: { id: 2, canCreate: true, canRead: true, canUpdate: true, canDelete: true },
 * // }
 *
 * await resolveTranslatableCollectionRecordPermissions(1, nonTranslatableCollection)
 * // {
 * //   en: { id: 1, canCreate: true, canRead: true, canUpdate: true, canDelete: true },
 * //   de: { id: 1, canCreate: true, canRead: true, canUpdate: true, canDelete: true },
 * //   fr: { id: 1, canCreate: true, canRead: true, canUpdate: true, canDelete: true },
 * // }
 * ```
 */
export async function resolveTranslatableCollectionRecordPermissions(
  id: number,
  collection: { name: keyof Collections; definition: SerializableCollection },
): Promise<ResolvedTranslatableCollectionRecordPermissions> {
  const translations: Partial<Record<LanguageCode, number | null>> = {}
  const results = {} as ResolvedTranslatableCollectionRecordPermissions
  const isManaged = collection.definition.authorField || collection.definition.editorsField
  const canManage = hasPermission(`collection:${kebabCase(collection.name)}:manage` as Permission)
  const canCreate = hasPermission(`collection:${kebabCase(collection.name)}:create` as Permission)
  const canUpdate = hasPermission(`collection:${kebabCase(collection.name)}:update` as Permission)
  const canDelete = hasPermission(`collection:${kebabCase(collection.name)}:delete` as Permission)

  if (collection.definition.translatable) {
    const q1 = await selectFrom(collection.name)
      .select('translations' as any)
      .where('id', '=', id)
      .populate()
      .first()

    if (q1.success && q1.data) {
      for (const [language, id] of Object.entries(q1.data.translations as Record<LanguageCode, number | null>)) {
        translations[language as LanguageCode] = id
      }
    } else {
      console.warn(`Failed to fetch translations for record \`${id}\` in collection \`${collection.name}\``, q1)
    }
  }

  for (const { code } of languages) {
    const _id = collection.definition.translatable ? (translations[code] ?? null) : id
    results[code] = {
      id: _id,
      canCreate,
      canRead: isNumber(_id) && (!isManaged || canManage),
      canUpdate: isNumber(_id) && canUpdate && (!isManaged || canManage),
      canDelete: isNumber(_id) && canDelete && (!isManaged || canManage),
    }
  }

  if (isManaged && !canManage && (canUpdate || canDelete || collection.definition.translatable)) {
    const userId = getUser()?.id
    const select: any = [
      collection.definition.authorField ? 'author' : null,
      collection.definition.editorsField ? 'editors' : null,
    ].filter(Boolean)

    if (collection.definition.translatable) {
      const q2 = await Promise.all(
        languages.map(({ code }) => {
          if (translations[code]) {
            return selectFrom(collection.name).select(select).where('id', '=', translations[code]).first()
          }
          return null
        }),
      )

      for (const [i, { code }] of languages.entries()) {
        let _canUpdate = false
        let _canDelete = false

        if (collection.definition.authorField) {
          _canUpdate = q2[i]?.data?.author === userId
          _canDelete = q2[i]?.data?.author === userId
        }

        if (collection.definition.editorsField) {
          _canUpdate ||= !!q2[i]?.data?.editors?.includes(userId)
        }

        results[code].canRead = !!q2[i]?.data
        results[code].canUpdate = canUpdate && _canUpdate
        results[code].canDelete = canDelete && _canDelete
      }
    } else if (canUpdate || canDelete) {
      const q3 = await selectFrom(collection.name).select(select).where('id', '=', id).first()

      for (const { code } of languages) {
        let _canUpdate = false
        let _canDelete = false

        if (collection.definition.authorField) {
          _canUpdate = q3?.data?.author === userId
          _canDelete = q3?.data?.author === userId
        }

        if (collection.definition.editorsField) {
          _canUpdate ||= !!q3?.data?.editors?.includes(userId)
        }

        results[code].canRead = !!q3?.data
        results[code].canUpdate = canUpdate && _canUpdate
        results[code].canDelete = canDelete && _canDelete
      }
    } else {
      for (const { code } of languages) {
        results[code].canRead = true
      }
    }
  }

  return results
}

/**
 * Creates a cached permission resolver for collection records.
 *
 * This composable function returns a method that resolves user permissions for specific records,
 * with built-in caching to prevent redundant permission checks for the same record ID.
 *
 * Returns an object with two properties:
 *
 * - `resolver`   - A function that accepts a record `id` and optional field values,
 *                  returning a `Promise` resolving to the permission details for that record.
 *                  The cache is based on the record ID only.
 *                  If you provide different `additionalFieldValues` for the same ID in subsequent calls,
 *                  the cached resolver from the first call will still be used.
 * - `clearCache` - A function to clear the cache for all record IDs.
 *
 * @example
 * ```ts
 * // Create a permission resolver for the 'posts' collection
 * const resolvePermissions = useCollectionRecordPermissions({
 *   name: 'posts',
 *   definition: postsCollection
 * })
 *
 * // Check permissions for record with ID 1337
 * const permissions = await resolvePermissions(1337)
 * // { id: 1337, canCreate: true, canRead: true, canUpdate: true, canDelete: false }
 *
 * // With additional field values to avoid extra API calls
 * const permissionsWithFields = await resolvePermissions(1337, {
 *   author: 1,
 *   editors: [2, 3]
 * })
 *
 * // Subsequent calls for the same ID will use the cached resolver
 * const samePermissions = await resolvePermissions(1337) // Uses cached resolver
 * ```
 */

export function useCollectionRecordPermissions(collection: {
  name: keyof Collections
  definition: SerializableCollection
}): { resolver: CollectionRecordPermissionsResolver; clearCache: () => void } {
  const cache: Record<number, () => Promise<ResolvedCollectionRecordPermissions>> = {}

  return {
    resolver: async (id: number, additionalFieldValues?: { author?: number | null; editors?: number[] }) => {
      if (!cache[id]) {
        cache[id] = () => resolveCollectionRecordPermissions(id, collection, additionalFieldValues)
      }

      return cache[id]()
    },
    clearCache: () => clear(cache),
  }
}
