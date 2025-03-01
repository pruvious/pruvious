import { __, type Collections } from '#pruvious/server'
import { isDefined, isString, kebabCase } from '@pruvious/utils'
import { pruviousError } from '../api/utils.server'
import type { GenericMetaCollection } from './define'

let collectionSlugMap: Record<
  string,
  { name: keyof Omit<Collections, 'Cache' | 'Queue'>; definition: GenericMetaCollection }
>

/**
 * Retrieves a collection object containing its name and definition using its URL path identifier (`slug`).
 * If the collection does not exist, a `404` error is thrown and the current event handler is halted.
 *
 * The collection `slug` is a URL-safe version of the collection name in kebab-case format.
 * For example, a collection named `MyCollection` will have a slug of `my-collection`.
 *
 * @returns an object containing the collection name and its definition.
 * @throws a `404` H3 error if the collection does not exist, halting any subsequent code execution in the current event handler.
 */
export async function getCollectionBySlug<T extends string | undefined>(
  slug: T,
): Promise<{ name: keyof Omit<Collections, 'Cache' | 'Queue'>; definition: GenericMetaCollection }> {
  if (!collectionSlugMap) {
    const { database } = await import('#pruvious/server')

    collectionSlugMap = {}

    for (const [name, collection] of Object.entries(database().collections)) {
      const slug = kebabCase(name)
      collectionSlugMap[slug] = { name: name, definition: collection } as any
    }
  }

  if (slug && collectionSlugMap[slug]) {
    return collectionSlugMap[slug]
  }

  throw pruviousError(null, {
    statusCode: 404,
    message: __('pruvious-api', 'Collection not found'),
  })
}

/**
 * Retrieves a collection object containing its name and definition from the current HTTP event context.
 * If the collection does not exist, a `404` error is thrown and the current event handler is halted.
 *
 * @returns an object containing the collection name and its definition.
 * @throws a `404` H3 error if the collection does not exist, halting any subsequent code execution in the current event handler.
 */
export async function getCollectionFromEvent(): Promise<{
  name: keyof Omit<Collections, 'Cache' | 'Queue'>
  definition: GenericMetaCollection
}> {
  const event = useEvent()
  const routerParams = getRouterParams(event)
  let collectionSlug: string | undefined

  if (isDefined(routerParams.collection)) {
    collectionSlug = routerParams.collection
  } else {
    const apiBasePath = useRuntimeConfig().pruvious.api.basePath
    const basePathParts = [...apiBasePath.split('/').filter(Boolean), 'collections']
    const pathParts = event.path.split('/').filter(Boolean)

    let match = true
    let i = 0

    for (const basePathPart of basePathParts) {
      if (basePathPart !== pathParts[i++]) {
        match = false
        break
      }
    }

    if (match && isString(pathParts[i])) {
      collectionSlug = pathParts[i]!.split('?')[0]
    }
  }

  return getCollectionBySlug(collectionSlug)
}
