import { defineCommand } from 'citty'
import { cyan } from 'colorette'
import { consola } from 'consola'
import { loadConfig, mergeConfigFile, readConfigFile } from '../config/config.js'
import { sortArgs } from '../shared.js'

export default defineCommand({
  meta: {
    name: 'remove',
    description: 'Remove a deployment server',
  },
  args: sortArgs({
    name: {
      type: 'string',
      description: 'Name of the server to remove',
    },
  }),
  async run({ args }) {
    const config = await loadConfig()

    let serverName = args.name

    if (!config.servers.length) {
      consola.info('No servers found')
      consola.box('Run `npx pruvious servers add` to add a new server')
      process.exit(0)
    } else if (serverName && !config.servers.find(({ name }) => name === serverName)) {
      consola.error(`Server ${cyan(serverName)} not found`)
      process.exit(1)
    }

    if (!serverName && config.servers.length) {
      serverName = (await consola.prompt('Select server to remove:', {
        type: 'select',
        options: config.servers.map(({ name, host }) => ({ value: name, label: name, hint: host })),
      })) as any

      if (typeof serverName === 'symbol') {
        process.exit(0)
      }
    }

    // Write to config file
    const configFile = await readConfigFile()
    const configFileServerIndex = configFile.servers.findIndex(({ name }) => name === serverName)
    configFile.servers.splice(configFileServerIndex, 1)
    await mergeConfigFile(configFile)

    consola.success(`Server ${cyan(serverName)} removed`)
  },
})
