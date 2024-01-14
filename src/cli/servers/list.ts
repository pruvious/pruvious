import { defineCommand } from 'citty'
import { cyan } from 'colorette'
import { consola } from 'consola'
import { loadConfig } from '../config/config.js'

export default defineCommand({
  meta: {
    name: 'list',
    description: 'List deployment servers',
  },
  async run() {
    const config = await loadConfig()

    if (!config.servers.length) {
      consola.info('No servers found')
      process.exit(0)
    }

    consola.log('Servers:')
    consola.log('')

    config.servers
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach(({ name, host }) => {
        consola.log(`  ${cyan(name)} (${host})`)
      })
  },
})
