import type { CollectionMeta, GenericSerializableFieldOptions } from '#pruvious/server'

export interface SerializableCollection extends Pick<CollectionMeta, 'translatable' | 'syncedFields' | 'ui'> {
  /**
   * The name of the `createdAt` field in the collection.
   * If the collection does not have a `createdAt` field, this property is `null`.
   */
  createdAtField: string | null

  /**
   * The name of the `updatedAt` field in the collection.
   * If the collection does not have an `updatedAt` field, this property is `null`.
   */
  updatedAtField: string | null

  /**
   * The name of the `author` field in the collection.
   * If the collection does not have an `author` field, this property is `null`.
   */
  authorField: string | null

  /**
   * The name of the `editors` field in the collection.
   * If the collection does not have an `editors` field, this property is `null`.
   */
  editorsField: string | null

  /**
   * A key-value object of `GenericSerializableFieldOptions` objects representing the structure of the collection.
   *
   * - Object keys represent the field names.
   * - Object values are instances of the `GenericSerializableFieldOptions` objects.
   */
  fields: Record<string, GenericSerializableFieldOptions>

  /**
   * API endpoints available for interacting with the collection, resolved from the collection definition and the user's access permissions.
   */
  api: {
    /**
     * Indicates whether the current user has permission to create new records in the collection.
     */
    create: boolean

    /**
     * Indicates whether the current user has permission to read collection records.
     */
    read: boolean

    /**
     * Indicates whether the current user has permission to update collection records.
     */
    update: boolean

    /**
     * Indicates whether the current user has permission to delete collection records.
     */
    delete: boolean
  }

  /**
   * Indicates whether translations can be copied between languages in the collection.
   */
  copyTranslation: boolean

  /**
   * Indicates whether records can be duplicated in the collection.
   */
  duplicate: boolean
}
