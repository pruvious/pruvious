import fs from 'fs-extra'
import path from 'path'

export interface PrujectConfig {
  id: string
  servers?: ServerMeta[]
}

export interface ServerMeta {
  name: string
  host: string
  port: number
}

const prujectConfig = path.resolve(process.cwd(), 'pruject.config.json')

export function getConfig(): PrujectConfig {
  return fs.existsSync(prujectConfig) ? fs.readJsonSync(prujectConfig) : {}
}

export function updateConfig(config: PrujectConfig): void {
  return fs.writeJsonSync(prujectConfig, config, { spaces: 2 })
}

export function listServers(): ServerMeta[] {
  return getConfig().servers ?? []
}
