import { getUser, pruviousError } from '#pruvious/server'
import { defineEventHandler } from 'h3'
import { getAccessibleTargetIds } from '../../../utils/deployAccess'

export default defineEventHandler(async (event) => {
  const user = getUser()

  if (!user) {
    throw pruviousError(event, { statusCode: 401 })
  }

  const ids = await getAccessibleTargetIds(user)

  return { ids }
})
