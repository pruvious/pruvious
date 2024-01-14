import { defineCommand } from 'citty'
import { cyan } from 'colorette'
import consola from 'consola'
import { execa } from 'execa'
import { loadConfig } from './config/config.js'
import { execaOptions } from './default.js'
import { SSH } from './servers/SSH.js'
import { sortArgs } from './shared.js'

export default defineCommand({
  meta: {
    name: 'mirror',
    description: 'Mirror content between production and local site',
  },
  args: sortArgs({
    domain: {
      type: 'string',
      alias: 'site',
      description: 'Domain name of the site to mirror',
    },
    direction: {
      type: 'string',
      description: 'Direction to mirror',
      options: ['up', 'down'],
    },
    force: {
      type: 'boolean',
      alias: 'f',
      description: 'Mirror without confirmation',
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
    let direction = args.direction

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
      domain = (await consola.prompt('Select site to mirror:', {
        type: 'select',
        options: sites.map(({ server, domain }) => ({ value: domain, label: domain, hint: server })),
      })) as any

      if (typeof domain === 'symbol') {
        process.exit(0)
      }
    }

    if (!direction) {
      direction = (await consola.prompt('Select direction to mirror:', {
        type: 'select',
        options: [
          { value: 'up', label: 'Up', hint: 'Local -> Production' },
          { value: 'down', label: 'Down', hint: 'Production -> Local' },
        ],
      })) as any

      if (typeof direction === 'symbol') {
        process.exit(0)
      }
    }

    if (!args.force) {
      if (direction === 'up') {
        consola.warn(
          `This action will replace the ${cyan(
            'production',
          )} site's database and uploads with those from the local site`,
        )
      } else {
        consola.warn(
          `This action will replace the ${cyan(
            'local',
          )} site's database and uploads with those from the production site`,
        )
      }

      const confirm = await consola.prompt('Do you want to continue?', { type: 'confirm', initial: false })

      if (!confirm) {
        process.exit(0)
      }
    }

    const server = config.servers.find((server) => server.sites.some((site) => site.domain === domain))!
    const site = server.sites.find((site) => site.domain === domain)!

    // Mirror site
    const ssh = new SSH(server, !!args.ignore)
    await ssh.connect()
    let startDev = false

    if (direction === 'down') {
      const db = await ssh.mirrorSiteDown(site, !!args.force)
      startDev = db === 'sqlite'
    } else {
      await ssh.mirrorSiteUp(site, !!args.force)
    }

    ssh.disconnect()

    if (direction === 'down') {
      consola.success(`Site ${cyan(domain)} mirrored from production to local`)
    } else {
      consola.success(`Site ${cyan(domain)} mirrored from local to production`)
    }

    if (startDev) {
      consola.info(`Starting dev server`)
      await execa('pruvious dev', execaOptions)
    }
  },
})
