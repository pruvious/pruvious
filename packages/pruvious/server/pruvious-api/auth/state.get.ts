import { omit } from '@pruvious/utils'

export default defineEventHandler(async (event) => {
  return event.context.pruvious.auth.isLoggedIn
    ? { ...event.context.pruvious.auth, user: omit(event.context.pruvious.auth.user, ['password', 'tokenSubject']) }
    : event.context.pruvious.auth
})
