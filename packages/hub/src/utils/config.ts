import { resolvePath } from '@pruvious/cli-utils'
import fs from 'node:fs'
import os from 'node:os'
import { dirname, join } from 'pathe'

interface Config {
  apps: {
    path: string
    secret: string
  }[]
}

let configPath = ''

export function setConfigPath(path: string) {
  configPath = path
}

export function readConfigFile(): Config {
  const path = resolveConfigPath()

  if (fs.existsSync(path)) {
    const content = fs.readFileSync(path, 'utf-8')
    return JSON.parse(content)
  }

  return writeConfigFile({ apps: [] })
}

export function writeConfigFile(data: Config): Config {
  const path = resolveConfigPath()
  fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8')
  return data
}

function resolveConfigPath() {
  const resolvedPath = configPath.trim() ? resolvePath(configPath) : getDefaultConfigPath()
  const dir = dirname(resolvedPath)

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  return resolvedPath
}

export function getDefaultConfigPath() {
  return join(os.homedir(), '.pruvious-hub.json')
}
