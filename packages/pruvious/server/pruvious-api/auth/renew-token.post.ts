import { assertUser, getToken, invalidateToken, setTokenCookies, signToken } from '#pruvious/server'
import { toSeconds } from '@pruvious/utils'
import { decodeJwt } from 'jose'

export default defineEventHandler(async (event) => {
  assertUser(event)

  const runtimeConfig = useRuntimeConfig()
  const oldToken = getToken()!
  const { exp, iat } = decodeJwt(oldToken)
  const oldTokenLifetime = exp! - iat!
  const oldTokenIsExtended = oldTokenLifetime === toSeconds(runtimeConfig.pruvious.auth.jwt.expiration.extended)

  await invalidateToken(oldToken)

  const newToken = await signToken(event.context.pruvious.auth.user.tokenSubject, oldTokenIsExtended)

  setTokenCookies(newToken)

  return { token: newToken }
})
