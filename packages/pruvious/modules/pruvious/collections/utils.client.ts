import type { CollectionMeta, GenericSerializableFieldOptions } from '#pruvious/server'

export interface SerializableCollection extends Pick<CollectionMeta, 'translatable' | 'syncedFields' | 'ui'> {
  /**
   * Indicates whether the `createdAt` field is enabled in the collection.
   */
  createdAtField: boolean

  /**
   * Indicates whether the `updatedAt` field is enabled in the collection.
   */
  updatedAtField: boolean

  /**
   * Indicates whether the `author` field is enabled in the collection.
   */
  authorField: boolean

  /**
   * Indicates whether the `editors` field is enabled in the collection.
   */
  editorsField: boolean

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
