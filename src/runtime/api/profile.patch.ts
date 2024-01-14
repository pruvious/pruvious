import { defineEventHandler, setResponseStatus } from 'h3'
import { readInputData } from '../collections/input'
import { query } from '../collections/query'
import { objectOmit } from '../utils/object'
import { __ } from '../utils/server/translate-string'
import { getCapabilities } from '../utils/users'

export default defineEventHandler(async (event) => {
  if (!event.context.auth.isLoggedIn) {
    setResponseStatus(event, 401)
    return __(event, 'pruvious-server', 'Unauthorized due to either invalid credentials or missing authentication')
  }

  if (!event.context.auth.user.isAdmin && !getCapabilities(event.context.auth.user)['update-profile']) {
    setResponseStatus(event, 403)
    return __(event, 'pruvious-server', 'Forbidden due to insufficient permissions')
  }

  const input = await readInputData(event, 'users')

  if (input.errors.length) {
    setResponseStatus(event, 400)
    return input.errors.join('\n')
  }

  const result = await query('users', event.context.language)
    .deselect({ password: true })
    .where('id', event.context.auth.user.id)
    .populate()
    .update(objectOmit(input.data, ['capabilities', 'email', 'isActive', 'isAdmin', 'role'] as any))

  if (result.success) {
    if (result.records.length) {
      return result.records[0]
    } else {
      setResponseStatus(event, 404)
      return __(event, 'pruvious-server', 'Resource not found')
    }
  } else if (result.message) {
    setResponseStatus(event, 400)
    return result.message
  } else {
    setResponseStatus(event, 422)
    return result.errors
  }
})
