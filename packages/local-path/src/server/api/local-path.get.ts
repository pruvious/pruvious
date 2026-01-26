import { __, applyFilters, assertUser, assertUserPermissions, pruviousError } from '#pruvious/server'
import fs from 'node:fs'
import os from 'node:os'
import { join, resolve } from 'pathe'
import type { LocalPathFile } from '../../modules/pruvious-local-path/types'

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig()

  if (runtimeConfig.pruviousLocalPath.requireAuth) {
    assertUser(event)
  }

  if (runtimeConfig.pruviousLocalPath.requirePermissions) {
    assertUserPermissions(event, runtimeConfig.pruviousLocalPath.requirePermissions)
  }

  let dir = getQuery(event).dir?.toString().trim() || process.cwd()

  try {
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
    } else if (!fs.lstatSync(dir).isDirectory()) {
      throw pruviousError(event, {
        statusCode: 400,
        message: __('pruvious-api', 'The path `$path` must be a directory', { path: dir }),
      })
    }

    return applyFilters(
      'local-path:files',
      fs.readdirSync(dir, { withFileTypes: true }).map((file) => ({
        name: file.name,
        path: join(dir, file.name),
        type: file.isDirectory() ? 'directory' : 'file',
      })) satisfies LocalPathFile[],
      {},
    )
  } catch (error) {
    throw pruviousError(event, {
      statusCode: 400,
      message:
        error instanceof Error
          ? error.message
          : __('pruvious-api', 'The path `$path` does not exist or is not accessible', { path: dir }),
    })
  }
})
