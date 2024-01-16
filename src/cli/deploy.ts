import { defineCommand } from 'citty'
import { cyan } from 'colorette'
import consola from 'consola'
import { loadConfig } from './config/config.js'
import { SSH } from './servers/SSH.js'
import { sortArgs } from './shared.js'

export default defineCommand({
  meta: {
    name: 'deploy',
    description: 'Deploy site to production',
  },
  args: sortArgs({
    domain: {
      type: 'string',
      alias: 'site',
      description: 'Domain name of the site to deploy',
    },
    force: {
      type: 'boolean',
      alias: 'f',
      description: 'Deploy without confirmation',
    },
    backup: {
      type: 'boolean',
      description: 'Backup current site before deploying',
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
    let backup = args.backup

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
      domain = (await consola.prompt('Select site to deploy:', {
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
      consola.warn(`Site ${cyan(domain)} will be deployed to server ${cyan(server.name)}`)
      const confirmation = await consola.prompt('Do you want to continue?', { type: 'confirm', initial: false })

      if (!confirmation || typeof confirmation === 'symbol') {
        process.exit(0)
      }
    }

    const ssh = new SSH(server, !!args.ignore)
    await ssh.connect()

    // Create backup
    if (backup) {
      await ssh.backupSite(site)
    }

    // Deploy site
    await ssh.deploySite(site)
    ssh.disconnect()

    consola.success(`Site ${cyan(domain)} deployed`)
  },
})
