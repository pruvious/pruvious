import { type PruviousState, selectFrom } from '#pruvious/server'

export default defineEventHandler(async () => {
  const usersCountQuery = await selectFrom('Users').count()

  return {
    installed: usersCountQuery.success && usersCountQuery.data > 0,
    version: '@todo',
  } satisfies PruviousState
})
