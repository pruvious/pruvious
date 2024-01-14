import pgConnectionString from 'pg-connection-string'
import { getModuleOption } from '../instances/state'
import { isString } from '../utils/string'

export type DatabaseInfo =
  | { dialect: 'sqlite'; storage: string }
  | ({
      dialect: 'postgres'
      database: string
      host: string
      port: number
      username?: string
      password?: string
      ssl?: boolean
    } & Record<string, any>)

export function getDatabaseDialect(): 'postgres' | 'sqlite' {
  return getModuleOption('database').startsWith('postgresql:') ? 'postgres' : 'sqlite'
}

export function getDatabaseInfo(): DatabaseInfo {
  const database = getModuleOption('database')
  const dialect = getDatabaseDialect()

  if (dialect === 'postgres') {
    const config = pgConnectionString.parse(database)

    return {
      dialect,
      database: config.database || '',
      host: config.host || '',
      port: config.port ? +config.port : 5432,
      username: config.user,
      password: config.password,
      ssl: isString(config.ssl) ? config.ssl === 'true' : !!config.ssl,
    }
  } else {
    return { dialect, storage: database.slice(7) }
  }
}
