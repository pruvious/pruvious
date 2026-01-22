import fs from 'node:fs'
import { join } from 'pathe'

export function getAppInfo(path: string): { version: string } | null {
  const packageJSON = JSON.parse(fs.readFileSync(join(path, 'server', 'package.json'), 'utf-8'))

  if (packageJSON?.name === '@pruvious/hub-app-prod') {
    return { version: packageJSON.version }
  }

  return null
}
