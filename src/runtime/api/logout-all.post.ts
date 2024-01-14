import { collections } from '#pruvious/collections'
import { defineEventHandler, getQuery, setResponseStatus } from 'h3'
import { removeUserTokens } from '../http/auth'
import { isPositiveInteger } from '../utils/number'
import { __ } from '../utils/server/translate-string'
import { getCapabilities } from '../utils/users'

export default defineEventHandler(async (event) => {
  if (!event.context.auth.isLoggedIn) {
    setResponseStatus(event, 401)
    return __(event, 'pruvious-server', 'Unauthorized due to either invalid credentials or missing authentication')
  }

  const qs = getQuery(event)
  const userId = qs.id ? +qs.id.toString() : event.context.auth.user.id

  if (!isPositiveInteger(userId)) {
    setResponseStatus(event, 400)
    return __(event, 'pruvious-server', 'Invalid user ID')
  }

  if (
    userId !== event.context.auth.user.id &&
    !event.context.auth.user.isAdmin &&
    !getCapabilities(event.context.auth.user)['collection-users-update']
  ) {
    setResponseStatus(event, 403)
    return __(event, 'pruvious-server', "You don't have the necessary permissions to $operate $record", {
      operate: __(event, 'pruvious-server', 'manage'),
      record: __(event, 'pruvious-server', collections.users.label.record.plural as any),
    })
  }

  return await removeUserTokens(userId)
})
