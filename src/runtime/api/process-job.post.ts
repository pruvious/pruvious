import { jobs } from '#pruvious/server'
import { defineEventHandler, setResponseStatus } from 'h3'
import jwt from 'jsonwebtoken'
import { getBearerToken } from '../http/auth'
import { db } from '../instances/database'
import { getModuleOption } from '../instances/state'
import type { ResolvedJobDefinition } from '../jobs/job.definition'
import { __ } from '../utils/server/translate-string'
import { isString } from '../utils/string'

export default defineEventHandler(async (event) => {
  if (!getModuleOption('jobs')) {
    setResponseStatus(event, 404)
    return __(event, 'pruvious-server', 'Resource not found')
  }

  const token = getBearerToken(event)

  let jti = ''

  try {
    const tokenData: any = jwt.verify(token, getModuleOption('jwt').secretKey)

    if (isString(tokenData.jti)) {
      jti = tokenData.jti
    } else {
      setResponseStatus(event, 401)
      return __(event, 'pruvious-server', 'Unauthorized')
    }
  } catch {
    setResponseStatus(event, 401)
    return __(event, 'pruvious-server', 'Unauthorized')
  }

  const database = await db()
  const job: any = await database.model('_jobs').findOne({ where: { jti } })

  if (!job) {
    setResponseStatus(event, 404)
    return __(event, 'pruvious-server', 'The requested job does not exist')
  }

  const deleted = await database.model('_jobs').destroy({ where: { jti } })

  if (!deleted) {
    setResponseStatus(event, 410)
    return __(event, 'pruvious-server', 'The requested job no longer exists')
  }

  const definition: ResolvedJobDefinition<any> | undefined = (jobs as any)[job.name]
  const args = JSON.parse(job.args as any)

  if (!definition) {
    setResponseStatus(event, 400)
    return __(event, 'pruvious-server', 'The job is not defined')
  }

  if (definition.beforeProcess) {
    await definition.beforeProcess({ definition, args })
  }

  const start = performance.now()

  try {
    const response = await definition.callback(...args)
    const duration = performance.now() - start
    const processedAt = Date.now()

    if (definition.afterProcess) {
      await definition.afterProcess({ definition, args, duration, processedAt, success: true, response })
    }

    return { success: true, processedAt, duration, response }
  } catch (e: any) {
    const duration = performance.now() - start
    const processedAt = Date.now()

    if (definition.afterProcess) {
      await definition.afterProcess({ definition, args, duration, processedAt, success: false, error: e })
    }

    setResponseStatus(event, 400)
    return { success: false, processedAt, duration, error: e.message }
  }
})
