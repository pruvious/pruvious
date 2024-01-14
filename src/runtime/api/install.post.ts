import { defineEventHandler, setResponseStatus } from 'h3'
import { readInputData } from '../collections/input'
import { query } from '../collections/query'
import { generateToken, storeToken } from '../http/auth'
import { getModuleOption } from '../instances/state'
import { __ } from '../utils/server/translate-string'

export default defineEventHandler(async (event) => {
  const installed = !!(await query('users', event.context.language).where('isAdmin', true).count())

  if (installed) {
    setResponseStatus(event, 400)
    return __(event, 'pruvious-server', 'Pruvious is already installed')
  }

  const input = await readInputData(event, 'users')

  if (input.errors.length) {
    setResponseStatus(event, 400)
    return input.errors.join('\n')
  }

  const result = await query('users', event.context.language).create({
    isActive: true,
    isAdmin: true,
    firstName: (input.data as any).firstName,
    lastName: (input.data as any).lastName,
    email: (input.data as any).email,
    password: (input.data as any).password,
  } as any)

  if (result.success) {
    const token = generateToken(result.record.id, getModuleOption('jwt').expiration)
    await storeToken(token)
    return token
  } else if (result.message) {
    setResponseStatus(event, 400)
    return result.message
  } else {
    setResponseStatus(event, 422)
    return result.errors
  }
})
