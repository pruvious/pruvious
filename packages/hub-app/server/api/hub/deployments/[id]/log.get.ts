import { __, getUser, pruviousError, selectFrom } from '#pruvious/server'
import { castToNumber, isPositiveInteger } from '@pruvious/utils'
import { createEventStream, defineEventHandler, getRouterParam } from 'h3'
import { existsSync, statSync } from 'node:fs'
import { open } from 'node:fs/promises'
import { canAccessTarget } from '../../../../utils/deployAccess'
import { resolveDeployLogPath } from '../../../../utils/deployLog'

const POLL_INTERVAL_MS = 500
const CHUNK_SIZE = 64 * 1024

export default defineEventHandler(async (event) => {
  const user = getUser()

  if (!user) {
    throw pruviousError(event, { statusCode: 401 })
  }

  const deploymentId = castToNumber(getRouterParam(event, 'id'))

  if (!isPositiveInteger(deploymentId)) {
    throw pruviousError(event, {
      statusCode: 400,
      message: __('pruvious-api', 'The `$param` parameter is invalid', { param: 'id' }),
    })
  }

  const deploymentQuery = await selectFrom('Deployments').where('id', '=', deploymentId).first()

  if (!deploymentQuery.success || !deploymentQuery.data) {
    throw pruviousError(event, {
      statusCode: 404,
      message: __('pruvious-api', 'Deployment not found'),
    })
  }

  if (!(await canAccessTarget(user, deploymentQuery.data.target as number))) {
    throw pruviousError(event, {
      statusCode: 404,
      message: __('pruvious-api', 'Deployment not found'),
    })
  }

  const logPath = resolveDeployLogPath(deploymentId)
  const stream = createEventStream(event)

  let offset = 0
  let stopped = false

  const pump = async (): Promise<boolean> => {
    if (!existsSync(logPath)) {
      return false
    }

    const stats = statSync(logPath)
    if (stats.size <= offset) {
      return false
    }

    const handle = await open(logPath, 'r')
    try {
      while (offset < stats.size) {
        const buffer = Buffer.alloc(Math.min(CHUNK_SIZE, stats.size - offset))
        const { bytesRead } = await handle.read(buffer, 0, buffer.length, offset)
        if (bytesRead === 0) {
          break
        }
        const chunk = buffer.subarray(0, bytesRead).toString('utf8')
        await stream.push({ event: 'log', data: chunk })
        offset += bytesRead
      }
    } finally {
      await handle.close()
    }

    return true
  }

  const isTerminal = (status: unknown) => status === 'success' || status === 'failed'

  const tick = async () => {
    if (stopped) {
      return
    }

    try {
      await pump()
      const statusQuery = await selectFrom('Deployments').select(['status']).where('id', '=', deploymentId).first()
      const status = statusQuery.success && statusQuery.data ? statusQuery.data.status : null

      if (isTerminal(status)) {
        await pump()
        await stream.push({ event: 'done', data: String(status) })
        stopped = true
        await stream.close()
        return
      }
    } catch (error: any) {
      try {
        await stream.push({ event: 'error', data: error?.message ?? 'stream error' })
      } catch {}
      stopped = true
      await stream.close()
      return
    }

    setTimeout(tick, POLL_INTERVAL_MS)
  }

  stream.onClosed(() => {
    stopped = true
  })

  void tick()
  return stream.send()
})
