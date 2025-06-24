import type { GenericSerializableFieldOptions } from '#pruvious/server'
import type { GenericSingleton, SingletonRoutingOptions } from './define'

export interface SerializableSingleton extends Pick<GenericSingleton, 'translatable' | 'syncedFields' | 'ui'> {
  /**
   * A key-value object of `GenericSerializableFieldOptions` objects representing the structure of the singleton.
   *
   * - Object keys represent the field names.
   * - Object values are instances of the `GenericSerializableFieldOptions` objects.
   */
  fields: Record<string, GenericSerializableFieldOptions>

  /**
   * API endpoints available for interacting with the singleton, resolved from the singleton definition and the user's access permissions.
   */
  api: {
    /**
     * Indicates whether the current user has permission to read the singleton content.
     */
    read: boolean

    /**
     * Indicates whether the current user has permission to update the singleton content.
     */
    update: boolean
  }

  /**
   * Indicates whether translations can be copied between languages in the singleton.
   */
  copyTranslation: boolean

  /**
   * Controls whether routes can be assigned to this singleton.
   * When a route is assigned, certain singleton fields become publicly accessible via the route's `$data` property.
   */
  routing: {
    /**
     * Indicates whether routing is enabled for the singleton.
     */
    enabled: boolean
  } & Required<SingletonRoutingOptions>
}
