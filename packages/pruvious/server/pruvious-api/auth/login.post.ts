import {
  __,
  assertInput,
  parseBody,
  pruviousError,
  selectFrom,
  setTokenCookies,
  signToken,
  verifyPassword,
} from '#pruvious/server'
import { emailRegex } from '@pruvious/orm'
import { isBoolean, isString } from '@pruvious/utils'

export default defineEventHandler(async (event) => {
  const { email, password, remember } = await parseBody(event, 'object').then(({ input }) => input)

  await assertInput(event, {
    email: [
      { test: Boolean, message: __('pruvious-orm', 'This field is required') },
      { test: isString, message: __('pruvious-orm', 'The value must be a string') },
      { test: (value) => emailRegex.test(value), message: __('pruvious-orm', 'Invalid email address') },
    ],
    password: [
      { test: Boolean, message: __('pruvious-orm', 'This field is required') },
      { test: isString, message: __('pruvious-orm', 'The value must be a string') },
    ],
  })

  const userQuery = await selectFrom('Users')
    .select(['password', 'tokenSubject'])
    .where('email', '=', email)
    .where('isActive', '=', true)
    .withCustomContextData({ __ignoreMaskFieldsHook: true })
    .first()

  const isPasswordValid = await verifyPassword(password, userQuery)

  if (!isPasswordValid) {
    throw pruviousError(event, {
      statusCode: 401,
      message: __('pruvious-api', 'Incorrect credentials'),
    })
  }

  const extendedToken = isBoolean(remember) && remember
  const token = await signToken(userQuery, extendedToken)

  setTokenCookies(token)

  return { token }
})
