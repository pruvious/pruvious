import { defineCommand } from 'citty'
import { cyan } from 'colorette'
import consola from 'consola'
import { loadConfig } from './config/config.js'
import { SSH } from './servers/SSH.js'
import { sortArgs } from './shared.js'

export default defineCommand({
  meta: {
    name: 'backup',
    description: 'Backup production site',
  },
  args: sortArgs({
    domain: {
      type: 'string',
      alias: 'site',
      description: 'Domain name of the site to backup',
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
      domain = (await consola.prompt('Select site to backup:', {
        type: 'select',
        options: sites.map(({ server, domain }) => ({ value: domain, label: domain, hint: server })),
      })) as any

      if (typeof domain === 'symbol') {
        process.exit(0)
      }
    }

    const server = config.servers.find((server) => server.sites.some((site) => site.domain === domain))!
    const site = server.sites.find((site) => site.domain === domain)!

    // Backup site
    const ssh = new SSH(server, !!args.ignore)
    await ssh.connect()
    await ssh.backupSite(site)
    ssh.disconnect()

    consola.success(`Site ${cyan(domain)} backed up`)
  },
})
