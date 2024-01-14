import { defineCommand } from 'citty'
import { cyan } from 'colorette'
import { consola } from 'consola'
import { loadConfig, mergeConfigFile, readConfigFile } from '../config/config.js'
import { SSH } from '../servers/SSH.js'
import { sortArgs } from '../shared.js'

export default defineCommand({
  meta: {
    name: 'remove',
    description: 'Remove a production site',
  },
  args: sortArgs({
    domain: {
      type: 'string',
      alias: 'site',
      description: 'Domain name of the site to remove',
    },
    force: {
      type: 'boolean',
      alias: 'f',
      description: 'Remove without confirmation',
    },
    ignore: {
      type: 'boolean',
      description: 'Ignore all errors',
    },
  }),
  async run({ args }) {
    const config = await loadConfig()
    const sites = config.servers
      .flatMap(({ name, sites }) => sites.map(({ domain }) => ({ server: name, domain })))
      .sort((a, b) => a.domain.localeCompare(b.domain))

    let domain = args.domain

    if (!config.servers.length) {
      consola.info('No servers found')
      consola.box('Run `npx pruvious servers add` to add a new server')
      process.exit(0)
    } else if (!sites.length) {
      consola.info('No sites found')
      process.exit(0)
    } else if (domain && !sites.some((site) => site.domain === domain)) {
      consola.error(`Site ${cyan(domain)} not found`)
      process.exit(1)
    }

    if (!domain) {
      domain = (await consola.prompt('Select site to remove:', {
        type: 'select',
        options: sites.map(({ server, domain }) => ({ value: domain, label: domain, hint: server })),
      })) as any

      if (typeof domain === 'symbol') {
        process.exit(0)
      }
    }

    const server = config.servers.find((server) => server.sites.some((site) => site.domain === domain))!
    const site = server.sites.find((site) => site.domain === domain)!

    if (!args.force) {
      consola.warn(`Site ${cyan(domain)} will be removed from server ${cyan(server.name)}`)
      const confirmation = await consola.prompt('Do you want to continue?', { type: 'confirm', initial: false })

      if (!confirmation || typeof confirmation === 'symbol') {
        process.exit(0)
      }
    }

    // Remove site from server
    const ssh = new SSH(server, !!args.ignore)
    await ssh.connect()
    await ssh.removeSite(site)
    ssh.disconnect()

    // Write to config file
    const configFile = await readConfigFile()
    const serverIndex = configFile.servers.findIndex(({ name }) => name === server.name)

    if (serverIndex > -1) {
      const siteIndex = configFile.servers[serverIndex].sites.findIndex(({ domain: d }) => d === domain)

      if (siteIndex > -1) {
        configFile.servers[serverIndex].sites.splice(siteIndex, 1)
        await mergeConfigFile(configFile)
      }
    }

    consola.success(`Site ${cyan(domain)} removed`)
  },
})
