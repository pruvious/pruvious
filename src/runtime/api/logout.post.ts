import { defineEventHandler, setResponseStatus } from 'h3'
import { getBearerToken, removeToken } from '../http/auth'
import { __ } from '../utils/server/translate-string'

export default defineEventHandler(async (event) => {
  if (!event.context.auth.isLoggedIn) {
    setResponseStatus(event, 401)
    return __(event, 'pruvious-server', 'Unauthorized due to either invalid credentials or missing authentication')
  }

  const token = getBearerToken(event)
  await removeToken(token)

  return true
})
