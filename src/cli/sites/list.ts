import { defineCommand } from 'citty'
import { cyan } from 'colorette'
import { consola } from 'consola'
import { loadConfig } from '../config/config.js'

export default defineCommand({
  meta: {
    name: 'list',
    description: 'List production sites',
  },
  async run() {
    const config = await loadConfig()
    const sites = config.servers
      .flatMap(({ name, sites }) => sites.map(({ domain }) => ({ server: name, domain })))
      .sort((a, b) => a.domain.localeCompare(b.domain))

    if (!sites.length) {
      consola.info('No sites found')
      process.exit(0)
    }

    consola.log('Sites:')
    consola.log('')

    sites.forEach(({ domain, server }) => {
      consola.log(`  ${cyan(domain)} (${server})`)
    })
  },
})
