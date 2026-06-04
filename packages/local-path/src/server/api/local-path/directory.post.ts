import { __, assertUser, assertUserPermissions, pruviousError } from '#pruvious/server'
import { defineEventHandler, readBody } from 'h3'
import fs from 'node:fs'
import os from 'node:os'
import { join, resolve } from 'pathe'

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig()

  if (runtimeConfig.pruviousLocalPath.requireAuth) {
    assertUser(event)
  }

  if (runtimeConfig.pruviousLocalPath.requirePermissions) {
    assertUserPermissions(event, runtimeConfig.pruviousLocalPath.requirePermissions)
  }

  const body = (await readBody(event).catch(() => ({}))) as { dir?: string; name?: string }
  let dir = body.dir?.trim() ?? ''
  const name = body.name?.trim() ?? ''

  if (!dir) {
    throw pruviousError(event, {
      statusCode: 400,
      message: __('pruvious-api', 'The `$param` parameter is invalid', { param: 'dir' }),
    })
  }

  if (!name || name === '.' || name === '..' || /[\\/<>:"|?*\0]/.test(name)) {
    throw pruviousError(event, {
      statusCode: 400,
      message: __('pruvious-api', 'The `$param` parameter is invalid', { param: 'name' }),
    })
  }

  if (dir === '~') {
    dir = os.homedir()
  } else if (dir.startsWith('~/')) {
    dir = join(os.homedir(), dir.slice(2))
  } else {
    dir = resolve(dir)
  }

  if (dir !== '/') {
    dir = dir.replace(/[\\\/]+$/, '')
  }

  if (!fs.existsSync(dir)) {
    throw pruviousError(event, {
      statusCode: 400,
      message: __('pruvious-api', 'The path `$path` does not exist or is not accessible', { path: dir }),
    })
  }

  if (!fs.lstatSync(dir).isDirectory()) {
    throw pruviousError(event, {
      statusCode: 400,
      message: __('pruvious-api', 'The path `$path` must be a directory', { path: dir }),
    })
  }

  try {
    fs.accessSync(dir, fs.constants.W_OK)
  } catch {
    throw pruviousError(event, {
      statusCode: 400,
      message: __('pruvious-api', 'The path `$path` is not writable', { path: dir }),
    })
  }

  const target = join(dir, name)

  if (fs.existsSync(target)) {
    throw pruviousError(event, {
      statusCode: 409,
      message: __('pruvious-api', 'A folder with this name already exists'),
    })
  }

  try {
    fs.mkdirSync(target)
  } catch (error: any) {
    throw pruviousError(event, {
      statusCode: 500,
      message: error?.message ?? __('pruvious-api', 'Failed to create folder'),
    })
  }

  return { path: target }
})
