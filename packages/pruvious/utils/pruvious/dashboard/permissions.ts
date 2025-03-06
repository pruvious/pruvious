import { getUser, hasPermission, languages, selectFrom } from '#pruvious/client'
import type { Collections, LanguageCode, Permission, SerializableCollection } from '#pruvious/server'
import { isNumber, kebabCase } from '@pruvious/utils'

export type ResolvedCollectionRecordPermissions = Record<
  LanguageCode,
  {
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
>

/**
 * Resolves user permissions for all defined languages of a `collection` record identified by its `id`.
 * Requires the authenticated user to have read access to the base record.
 *
 *
 * @returns a key-value object with language codes as keys and resolved permissions as values.
 *          If the `collection` is not translatable, the resolved permissions will be the same for all languages.
 *
 * @example
 * ```ts
 * await resolveCollectionRecordPermissions(1, translatableCollection)
 * // {
 * //   en: { id: 1, canCreate: true, canUpdate: true, canDelete: true },
 * //   de: { id: null, canCreate: true, canUpdate: true, canDelete: true },
 * //   fr: { id: 2, canCreate: true, canUpdate: true, canDelete: true },
 * // }
 *
 * await resolveCollectionRecordPermissions(1, nonTranslatableCollection)
 * // {
 * //   en: { id: 1, canCreate: true, canUpdate: true, canDelete: true },
 * //   de: { id: 1, canCreate: true, canUpdate: true, canDelete: true },
 * //   fr: { id: 1, canCreate: true, canUpdate: true, canDelete: true },
 * // }
 * ```
 */
export async function resolveCollectionRecordPermissions(
  id: number,
  collection: { name: keyof Collections; definition: SerializableCollection },
): Promise<ResolvedCollectionRecordPermissions> {
  const translations: Partial<Record<LanguageCode, number | null>> = {}
  const results = {} as ResolvedCollectionRecordPermissions
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
