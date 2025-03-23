import type { Permission } from '#pruvious/server'
import type { QueryBuilderPrepareCallback } from '@pruvious/orm'
import { kebabCase } from '@pruvious/utils'
import { isDevelopment } from 'std-env'
import { databaseOperationToCrud, httpStatusCodeMessages } from '../api/utils.server'
import type { CollectionMeta, MetaContext } from './define'

/**
 * A collection guard that requires user authentication and specific permissions for each collection operation:
 *
 * - `collection:{slug}:create` - Allows creating new records.
 * - `collection:{slug}:read` - Allows reading existing records.
 * - `collection:{slug}:update` - Allows modifying existing records.
 * - `collection:{slug}:delete` - Allows removing existing records.
 *
 * @throws an error if the user is not authenticated or does not have the required permissions.
 */
export function collectionPermissionGuard({ collection, collectionName, operation }: MetaContext) {
  const meta = collection?.meta as CollectionMeta | undefined
  const crudOperation = databaseOperationToCrud[operation]
  const event = useEvent()

  if (meta?.authGuard.includes(crudOperation)) {
    if (!event.context.pruvious.auth.isLoggedIn) {
      setResponseStatus(event, 401, httpStatusCodeMessages[401])
      throw new Error(isDevelopment ? 'You must be logged in to access this resource' : httpStatusCodeMessages[401])
    }

    const slug = kebabCase(collectionName!)
    const permission = `collection:${slug}:${crudOperation}` as Permission

    if (!event.context.pruvious.auth.permissions.includes(permission)) {
      setResponseStatus(event, 403, httpStatusCodeMessages[403])
      throw new Error(
        isDevelopment
          ? `You must have the \`${permission}\` permission to perform this operation`
          : httpStatusCodeMessages[403],
      )
    }
  }
}

/**
 * Runs collection guards prior to query builder execution methods like `first()`, `run()`, `validate()` and others.
 * Additionally, it sets a `_guarded` flag on the context to enable field guards and other collection-specific filters.
 *
 * @see https://pruvious.com/docs/collections/guards (@todo set up this link)
 */
export function collectionGuards(): QueryBuilderPrepareCallback {
  return async (context) => {
    const meta = context.collection?.meta as CollectionMeta | undefined

    if (meta) {
      context.customData._guarded = true

      for (const guard of meta.guards as CollectionMeta['guards']) {
        await guard(context as any)
      }
    }
  }
}
