import { defineCommand } from 'citty'
import { cyan } from 'colorette'
import { consola } from 'consola'
import { loadConfig, mergeConfigFile, readConfigFile } from '../config/config.js'
import type { PruviousSite } from '../config/define.js'
import { SSH } from '../servers/SSH.js'
import { isHostname, sortArgs } from '../shared.js'

export default defineCommand({
  meta: {
    name: 'add',
    description: 'Add new production site',
  },
  args: sortArgs({
    server: {
      type: 'string',
      description: 'Name of the server to deploy to',
    },
    domain: {
      type: 'string',
      alias: 'site',
      description: 'Domain name of the site',
    },
    forceWWW: {
      type: 'boolean',
      description: 'Redirect non-www to www',
    },
    noWWW: {
      type: 'boolean',
      description: 'Do not set up www subdomain',
      default: false,
    },
    trailing: {
      type: 'boolean',
      description: 'Append trailing slashes to URLs',
    },
    override: {
      type: 'boolean',
      description: 'Override existing site with the same domain',
    },
    ignore: {
      type: 'boolean',
      description: 'Ignore all errors',
    },
    noLookup: {
      type: 'boolean',
      description: 'Skip checking if domain points to server',
    },
  }),
  async run({ args }) {
    const config = await loadConfig()

    let serverName = args.server
    let domain = args.domain
    let forceWWW = args.forceWWW
    let trailing = args.trailing

    if (!config.servers.length) {
      consola.info('No servers found')
      consola.box('Run `npx pruvious servers add` to add a new server')
      process.exit(0)
    } else if (serverName && !config.servers.find(({ name }) => name === serverName)) {
      consola.error(`Server ${cyan(serverName)} not found`)
      process.exit(1)
    }

    if (!domain) {
      domain = await consola.prompt('Domain name:', { type: 'text' })

      if (typeof domain === 'symbol') {
        process.exit(0)
      }

      if (!isHostname(domain)) {
        consola.error('Invalid domain name')
        process.exit(1)
      }
    }

    if (!args.override && config.servers.some(({ sites }) => sites.some((site) => site.domain === domain))) {
      consola.error(`Site ${cyan(domain)} already exists`)
      process.exit(1)
    }

    if (!serverName && config.servers.length) {
      serverName = (await consola.prompt('Select deployment server:', {
        type: 'select',
        options: config.servers.map(({ name, host }) => ({ value: name, label: name, hint: host })),
      })) as any

      if (typeof serverName === 'symbol') {
        process.exit(0)
      }
    }

    if (forceWWW === undefined && !args.noWWW) {
      const nonWWWDomain = domain.replace(/^www\./, '')

      forceWWW = await consola.prompt(`Redirect ${cyan(nonWWWDomain)} to ${cyan(`www.${nonWWWDomain}`)}?`, {
        type: 'confirm',
        initial: false,
      })

      if (typeof forceWWW === 'symbol') {
        process.exit(0)
      }
    }

    if (trailing === undefined) {
      trailing = await consola.prompt(`Append trailing slashes to URLs?`, { type: 'confirm', initial: false })

      if (typeof trailing === 'symbol') {
        process.exit(0)
      }
    }

    const server = config.servers.find(({ name }) => name === serverName)!
    const site: PruviousSite = { domain, forceWWW, noWWW: !!args.noWWW, trailing }

    // Configure site on server
    const ssh = new SSH(server, !!args.ignore)
    await ssh.connect()

    if (!args.noLookup) {
      await ssh.domainPointsToServer(domain)
    }

    await ssh.addSite(site, !!args.override)
    ssh.disconnect()

    // Write to config file
    const configFile = await readConfigFile()
    const serverIndex = configFile.servers.findIndex(({ name }) => name === serverName)

    if (serverIndex > -1) {
      const siteIndex = server.sites.findIndex(({ domain: d }) => d === domain)
      configFile.servers[serverIndex].sites[siteIndex > -1 ? siteIndex : configFile.servers[serverIndex].sites.length] =
        site
    } else {
      configFile.servers.push({ ...server, sites: [site] })
    }

    await mergeConfigFile(configFile)

    consola.success(`Updated local config file ${cyan('.ssh.ts')}`)
    consola.success(`Site ${cyan(site.domain)} added`)
    consola.box(
      `You can deploy your current project to this site by running ${cyan(`npx pruvious deploy --site=${domain}`)}`,
    )
  },
})
