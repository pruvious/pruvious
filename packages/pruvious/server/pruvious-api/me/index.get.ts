import { __, applyFilters, assertQuery, assertUserPermissions, pruviousError, selectFrom } from '#pruvious/server'
import { isEmpty } from '@pruvious/utils'
import { defaultMyAccountFields } from '../../hooks/filters/api/me/updatable-fields'

export default defineEventHandler(async (event) => {
  assertUserPermissions(event, ['update-own-account'])

  const { fields } = await applyFilters('api:me:updatable-fields', defaultMyAccountFields(), {})

  const query = await selectFrom('Users')
    .select(fields as any)
    .where('id', '=', event.context.pruvious.auth.user.id)
    .first()

  assertQuery(query)

  if (isEmpty(query.data)) {
    throw pruviousError(event, {
      statusCode: 404,
      message: __('pruvious-api', 'Resource not found'),
    })
  }

  return query.data
})
