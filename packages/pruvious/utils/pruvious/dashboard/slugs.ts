import { usePruviousDashboard } from '#pruvious/client'
import type { Collections, SerializableCollection, SerializableSingleton, Singletons } from '#pruvious/server'
import { slugify } from '@pruvious/utils'

/**
 * Retrieves a collection object containing its name and serializable definition using its URL path identifier (`slug`).
 * The collection must be available in the current `usePruviousDashboard()` context.
 *
 * The collection `slug` is a URL-safe version of the collection name in kebab-case format.
 * For example, a collection named `MyCollection` will have a slug of `my-collection`.
 *
 * @returns an object containing the collection name and its serializable definition or `null` if the collection does not exist.
 */
export function getCollectionBySlug(
  slug: string | string[] | undefined,
): { name: keyof Omit<Collections, 'Cache' | 'Queue'>; definition: SerializableCollection } | null {
  const dashboard = usePruviousDashboard()
  const collectionName = Object.keys(dashboard.value?.collections ?? {}).find((key) => slugify(key) === slug) as
    | keyof Omit<Collections, 'Cache' | 'Queue'>
    | undefined

  if (collectionName) {
    return { name: collectionName, definition: dashboard.value!.collections[collectionName]! }
  }

  return null
}

/**
 * Retrieves a singleton object containing its name and serializable definition using its URL path identifier (`slug`).
 * The singleton must be available in the current `usePruviousDashboard()` context.
 *
 * The singleton `slug` is a URL-safe version of the singleton name in kebab-case format.
 * For example, a singleton named `ThemeOptions` will have a slug of `theme-options`.
 *
 * @returns an object containing the singleton name and its serializable definition or `null` if the singleton does not exist.
 */
export function getSingletonBySlug(
  slug: string | string[] | undefined,
): { name: keyof Singletons; definition: SerializableSingleton } | null {
  const dashboard = usePruviousDashboard()
  const singletonName = Object.keys(dashboard.value?.singletons ?? {}).find((key) => slugify(key) === slug) as
    | keyof Singletons
    | undefined

  if (singletonName) {
    return { name: singletonName, definition: dashboard.value!.singletons[singletonName]! }
  }

  return null
}
