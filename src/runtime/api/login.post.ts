import argon2 from 'argon2'
import { defineEventHandler, setResponseStatus } from 'h3'
import { pruviousReadBody } from '../collections/input'
import { query } from '../collections/query'
import { generateToken, storeToken } from '../http/auth'
import { getModuleOption } from '../instances/state'
import { booleanishSanitizer } from '../sanitizers/booleanish'
import { stringSanitizer } from '../sanitizers/string'
import { catchFirstErrorMessage } from '../utils/function'
import { isKeyOf, isObject } from '../utils/object'
import { __ } from '../utils/server/translate-string'
import { booleanValidator } from '../validators/boolean'
import { requiredValidator } from '../validators/required'
import { emailValidator, stringValidator } from '../validators/string'

export default defineEventHandler(async (event) => {
  const body = await pruviousReadBody(event)
  const data: Record<string, any> = isObject(body) ? body : {}
  const email = isKeyOf(data, 'email') ? stringSanitizer({ value: data.email }) : undefined
  const password = isKeyOf(data, 'password') ? stringSanitizer({ value: data.password }) : undefined
  const remember = isKeyOf(data, 'remember') ? booleanishSanitizer({ value: data.remember }) : false
  const errors = await catchFirstErrorMessage({
    email: [
      () => requiredValidator({ __, language: event.context.language, value: email }),
      () => stringValidator({ value: email }),
      () => emailValidator({ value: email }),
    ],
    password: [
      () => requiredValidator({ __, language: event.context.language, value: password }),
      () => stringValidator({ value: password }),
    ],
    remember: [() => booleanValidator({ value: remember })],
  })

  if (Object.keys(errors).length) {
    setResponseStatus(event, 422)
    return errors
  }

  const user = await query('users', event.context.language)
    .select({ id: true, email: true, password: true })
    .where('email' as any, email)
    .where('isActive', true)
    .first()

  // Defend against user existence checks
  if (!user) {
    await argon2.verify(
      '$argon2id$v=19$m=65536,t=3,p=4$KfP27QvlNx/4Kjk2krKJ3Q$MwNHO4YcR+EPy3CtJYdkd+VJAygllJuBfClflE/kixQ',
      password,
    )
  }

  if (!user || !(await argon2.verify(user.password, password))) {
    setResponseStatus(event, 400)
    return __(event, 'pruvious-server', 'Incorrect credentials')
  }

  const token = generateToken(
    user.id,
    remember ? getModuleOption('jwt').expirationLong : getModuleOption('jwt').expiration,
  )

  await storeToken(token)

  return token
})
