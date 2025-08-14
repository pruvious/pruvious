import {
  __,
  applyFilters,
  assertQuery,
  assertUserPermissions,
  parseBody,
  pruviousError,
  update,
} from '#pruvious/server'
import { isEmpty, pick } from '@pruvious/utils'
import { defaultMyAccountFields } from '../../hooks/filters/api/me/updatable-fields'

export default defineEventHandler(async (event) => {
  assertUserPermissions(event, ['update-own-account'])

  const { fields } = await applyFilters('api:me:updatable-fields', defaultMyAccountFields(), {})
  const input = await parseBody(event, 'object').then(({ input }) => input)

  const query = await update('Users')
    .where('id', '=', event.context.pruvious.auth.user.id)
    .set(pick(input, fields))
    .returning(fields as any)
    .run()

  assertQuery(query)

  if (isEmpty(query.data)) {
    throw pruviousError(event, {
      statusCode: 404,
      message: __('pruvious-api', 'Resource not found'),
    })
  }

  return query.data[0]
})
