import { assertUser } from '#pruvious/server'

export default defineEventHandler(async (event) => {
  assertUser(event)

  return event.context.pruvious.auth.permissions
})
