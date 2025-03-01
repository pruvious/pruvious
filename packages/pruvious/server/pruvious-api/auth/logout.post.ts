import { assertUser, getToken, invalidateToken, removeTokenCookies } from '#pruvious/server'

export default defineEventHandler(async (event) => {
  assertUser(event)

  const token = getToken()!

  await invalidateToken(token)
  removeTokenCookies()

  return { success: true }
})
