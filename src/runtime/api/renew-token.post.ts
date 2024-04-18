import { defineEventHandler, setResponseStatus } from 'h3'
import jwt from 'jsonwebtoken'
import { generateToken, getBearerToken, removeToken, storeToken, type TokenData } from '../http/auth'
import { __ } from '../utils/server/translate-string'

export default defineEventHandler(async (event) => {
  if (!event.context.auth.isLoggedIn) {
    setResponseStatus(event, 401)
    return __(event, 'pruvious-server', 'Unauthorized due to either invalid credentials or missing authentication')
  }

  try {
    const currentToken = getBearerToken(event)
    const { iat, exp } = jwt.decode(currentToken) as TokenData
    const newToken = generateToken(event.context.auth.user.id, exp - iat)

    await storeToken(newToken)
    await removeToken(currentToken)

    return newToken
  } catch {
    setResponseStatus(event, 400)
    return __(event, 'pruvious-server', 'Invalid token')
  }
})
