import type { Permission } from '#pruvious/server'
import { kebabCase } from '@pruvious/utils'
import { isDevelopment } from 'std-env'
import { databaseOperationToCrud, httpStatusCodeMessages } from '../api/utils.server'
import type { SingletonContext } from './define'
import type { SingletonQueryBuilderPrepareCallback } from './SingletonBaseQueryBuilder'

/**
 * A singleton guard that requires user authentication and specific permissions for each singleton operation:
 *
 * - `singleton:{slug}:read` - Allows reading a singleton by its slugified name.
 * - `singleton:{slug}:update` - Allows updating a singleton by its slugified name.
 *
 * @throws an error if the user is not authenticated or does not have the required permissions.
 */
export function singletonPermissionGuard({ singleton, singletonName, operation }: SingletonContext) {
  const crudOperation = databaseOperationToCrud[operation]
  const event = useEvent()

  if (singleton.authGuard.includes(crudOperation)) {
    if (!event.context.pruvious.auth.isLoggedIn) {
      setResponseStatus(event, 401, httpStatusCodeMessages[401])
      throw new Error(isDevelopment ? 'You must be logged in to access this resource' : httpStatusCodeMessages[401])
    }

    const slug = kebabCase(singletonName!)
    const permission = `singleton:${slug}:${crudOperation}` as Permission

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
 * Runs singleton guards prior to query builder execution methods like `get()`, `run()`, and `validate()`.
 * Additionally, it sets a `_guarded` flag on the context to enable field guards and other singleton-specific filters.
 *
 * @see https://pruvious.com/docs/singletons/guards (@todo set up this link)
 */
export function singletonGuards(): SingletonQueryBuilderPrepareCallback {
  return async (context) => {
    context.customData._guarded = true

    for (const guard of context.singleton.guards) {
      await guard(context)
    }
  }
}
