import { defineEventHandler } from 'h3'
import { getBearerToken, verifyToken } from '../../http/auth'

export default defineEventHandler(async (event) => {
  const token = getBearerToken(event)
  const { isValid, user } = await verifyToken(token)

  event.context.auth = { isLoggedIn: isValid, user } as any
})
