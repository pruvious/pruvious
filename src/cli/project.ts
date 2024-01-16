import fs from 'fs-extra'
import { loadFile } from 'magicast'
import path from 'path'
import { parse } from './bytes.js'

export async function getProjectInfo(cwd?: string): Promise<{
  driveType: 'local' | 's3'
  uploadsPath: string
  uploadsMaxFileSize: number
  uploadsUrlPrefix: string | null
  database: string
}> {
  const { config } = await getNuxtConfig(cwd)

  const uploadsPath =
    config?.pruvious?.uploads?.drive?.path ??
    config?.modules?.find((m: [string, any]) => m[0] === 'pruvious')?.[1]?.uploads?.drive?.path ??
    './.uploads'

  const uploadsMaxFileSize =
    config?.pruvious?.uploads?.maxFileSize ??
    config?.modules?.find((m: [string, any]) => m[0] === 'pruvious')?.[1]?.uploads?.maxFileSize ??
    '16 MB'

  const driveType =
    config?.pruvious?.uploads?.drive?.type ??
    config?.modules?.find((m: [string, any]) => m[0] === 'pruvious')?.[1]?.uploads?.drive?.type ??
    'local'

  const uploadsUrlPrefix =
    config?.pruvious?.uploads?.drive?.type !== 's3' &&
    config?.modules?.find((m: [string, any]) => m[0] === 'pruvious')?.[1]?.uploads?.drive?.type !== 's3'
      ? config?.pruvious?.uploads?.drive?.urlPrefix ??
        config?.modules?.find((m: [string, any]) => m[0] === 'pruvious')?.[1]?.uploads?.drive?.urlPrefix ??
        'uploads'
      : null

  const database =
    config?.pruvious?.database ??
    config?.modules?.find((m: [string, any]) => m[0] === 'pruvious')?.[1]?.database ??
    'sqlite:./pruvious.db'

  return {
    driveType,
    uploadsPath,
    uploadsMaxFileSize: typeof uploadsMaxFileSize === 'string' ? parse(uploadsMaxFileSize) : uploadsMaxFileSize,
    uploadsUrlPrefix,
    database,
  }
}

export async function getNuxtConfig(cwd?: string) {
  const modulePath = path.resolve(cwd ?? process.cwd(), 'nuxt.config.ts')
  const module = fs.existsSync(modulePath) ? await loadFile(modulePath) : null

  if (module?.exports.default?.$type === 'function-call') {
    return { module, config: module.exports.default.$args[0] }
  } else if (module?.exports.default) {
    return { module, config: module.exports.default }
  }

  return { module: null, config: null }
}
