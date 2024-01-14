import editor from '@inquirer/editor'
import { defineCommand } from 'citty'
import { cyan } from 'colorette'
import { consola } from 'consola'
import { loadConfig, mergeConfigFile, readConfigFile } from '../config/config.js'
import type { PruviousServer } from '../config/define.js'
import { isHostname, isSlug, sortArgs } from '../shared.js'
import { SSH } from './SSH.js'

export default defineCommand({
  meta: {
    name: 'add',
    description: 'Add new deployment server',
  },
  args: sortArgs({
    'host': {
      type: 'string',
      description: 'Hostname or IP address of the server',
    },
    'name': {
      type: 'string',
      description: 'Name of the server',
    },
    'override': {
      type: 'boolean',
      description: 'Override existing server with the same name',
    },
    'port': {
      type: 'string',
      description: 'SSH port of the server',
      default: '22',
    },
    'private-key': {
      type: 'string',
      description: 'SSH private key required to connect to the server',
    },
    'ignore': {
      type: 'boolean',
      description: 'Ignore all errors',
    },
  }),
  async run({ args }) {
    let host = args.host
    let port = args.port ? parseInt(args.port) : 22
    let name = args.name
    let privateKey = args['private-key']

    if (typeof port !== 'number' || port < 1 || port > 65535) {
      consola.error('Invalid port')
      process.exit(1)
    }

    if (!host) {
      host = await consola.prompt('Hostname or IP address:', { type: 'text' })

      if (typeof host === 'symbol') {
        process.exit(0)
      }

      if (!isHostname(host)) {
        consola.error('Invalid hostname')
        process.exit(1)
      }
    }

    if (!name) {
      name = await consola.prompt('Server name:', { type: 'text' })

      if (typeof name === 'symbol') {
        process.exit(0)
      }

      if (!isSlug(name)) {
        consola.error('Invalid server name: only lowercase letters, numbers and dashes are allowed')
        process.exit(1)
      }
    }

    if (privateKey) {
      privateKey = privateKey.replaceAll('\\n', '\n')
    } else {
      consola.log('')
      privateKey = (await editor({ message: 'Private key:' })).trim()

      if (!privateKey) {
        consola.error('Private key is required')
        process.exit(1)
      }
    }

    const config = await loadConfig()

    if (!args.override && config.servers.some((server) => server.name === name)) {
      consola.error(`Server with name ${cyan(name)} already exists`)
      process.exit(1)
    }

    const server: PruviousServer = {
      name,
      host,
      ...(port !== 22 ? { port } : {}),
      privateKey,
      sites: [],
    }

    // Test connection
    const conn = new SSH(server, !!args.ignore)
    consola.info('Testing connection to server...')
    await conn.connect()
    conn.disconnect()

    // Write to config file
    const configFile = await readConfigFile()
    const serverIndex = configFile.servers.findIndex(({ name: n }) => n === name)
    configFile.servers[serverIndex > -1 ? serverIndex : configFile.servers.length] = server
    await mergeConfigFile(configFile)

    consola.success(`Updated local config file ${cyan('.ssh.ts')}`)
    consola.success(`Server ${cyan(name)} added`)
    consola.box(`You can add a new site to this server by running ${cyan(`npx pruvious sites add --server=${name}`)}`)
  },
})
