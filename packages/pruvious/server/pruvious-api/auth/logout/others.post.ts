import { assertQuery, assertUser, getToken, pruviousError, setTokenCookies, signToken, update } from '#pruvious/server'
import { isEmpty, toSeconds } from '@pruvious/utils'
import { decodeJwt } from 'jose'

export default defineEventHandler(async (event) => {
  assertUser(event)

  const runtimeConfig = useRuntimeConfig()
  const currentToken = getToken()!
  const { exp, iat } = decodeJwt(currentToken)
  const currentTokenLifetime = exp! - iat!
  const currentTokenIsExtended = currentTokenLifetime === toSeconds(runtimeConfig.pruvious.auth.jwt.expiration.extended)
  const query = await update('Users')
    .set({ tokenSubject: 'true' })
    .where('id', '=', event.context.pruvious.auth.user.id)
    .returning('tokenSubject')
    .withCustomContextData({ __ignoreMaskFieldsHook: true })
    .run()

  assertQuery(query)

  if (isEmpty(query.data)) {
    throw pruviousError(event, {
      statusCode: 401,
    })
  }

  const newToken = await signToken(query.data[0]!.tokenSubject, currentTokenIsExtended)

  setTokenCookies(newToken)

  return { token: newToken }
})
