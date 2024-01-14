import { defineCommand } from 'citty'
import { cyan } from 'colorette'
import consola from 'consola'
import { loadConfig } from './config/config.js'
import { SSH } from './servers/SSH.js'
import { sortArgs } from './shared.js'

export default defineCommand({
  meta: {
    name: 'restore',
    description: 'Restore backup of production site',
  },
  args: sortArgs({
    domain: {
      type: 'string',
      alias: 'site',
      description: 'Domain name of the site to restore',
    },
    id: {
      type: 'string',
      description: 'ID of the backup to restore',
    },
    force: {
      type: 'boolean',
      alias: 'f',
      description: 'Restore without confirmation',
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
    let id = args.id

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
      domain = (await consola.prompt('Select site to restore:', {
        type: 'select',
        options: sites.map(({ server, domain }) => ({ value: domain, label: domain, hint: server })),
      })) as any

      if (typeof domain === 'symbol') {
        process.exit(0)
      }
    }

    const server = config.servers.find((server) => server.sites.some((site) => site.domain === domain))!
    const site = server.sites.find((site) => site.domain === domain)!
    const ssh = new SSH(server, !!args.ignore)
    await ssh.connect()
    const backupOptions = await ssh.listBackups(site)

    if (!backupOptions.length) {
      consola.info(`No backups found for site ${cyan(domain)}`)
      consola.box(`Run \`npx pruvious backup --domain=${domain}\` to create a new backup`)
      process.exit(0)
    }

    if (id === undefined) {
      id = (await consola.prompt('Select backup to restore:', { type: 'select', options: backupOptions })) as any

      if (typeof id === 'symbol') {
        process.exit(0)
      }
    }

    if (!args.force) {
      consola.warn(`You are about to restore backup ID ${cyan(id)} of site ${cyan(domain)}`)
      const confirmation = await consola.prompt('Do you want to continue?', { type: 'confirm', initial: false })

      if (!confirmation || typeof confirmation === 'symbol') {
        process.exit(0)
      }
    }

    // Restore site
    await ssh.restoreSite(site, parseInt(id))
    ssh.disconnect()

    consola.success(`Site ${cyan(domain)} restored to backup ID ${cyan(id)}`)
  },
})
