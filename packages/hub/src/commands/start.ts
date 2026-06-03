import { cancel, isCancel, select } from '@clack/prompts'
import { colors, logger, resolvePath } from '@pruvious/cli-utils'
import { castToNumber, isPositiveInteger } from '@pruvious/utils'
import { defineCommand } from 'citty'
import { execa } from 'execa'
import { checkPort, getPort } from 'get-port-please'
import fs from 'node:fs'
import { sharedArgs } from '../utils/args'
import { readConfigFile } from '../utils/config'
import { getAppInfo } from '../utils/hub'
import { showNoRegisteredAppsMessages } from '../utils/messages'

export default defineCommand({
  meta: {
    name: 'start',
    description: 'Launch a Pruvious Hub app.',
  },
  args: {
    ...sharedArgs,
    dir: {
      type: 'positional',
      description: 'Path to an existing Pruvious Hub app.',
      default: '',
    },
    port: {
      type: 'string',
      description: 'Port number for the application server (automatically assigned if not specified).',
      default: '',
    },
  },
  async run(ctx) {
    const config = readConfigFile()
    const port = ctx.args.port ? castToNumber(ctx.args.port) : 4096
    let dir = ctx.args.dir

    if (!dir) {
      if (!config.apps.length) {
        showNoRegisteredAppsMessages()
        process.exit(0)
      }

      if (config.apps.length === 1) {
        dir = config.apps[0].path
      } else {
        const input = await select({
          message: 'Choose the Pruvious Hub app to start:',
          options: config.apps.map((app) => ({ label: app.path, value: app.path })),
          initialValue: config.apps[0].path,
        })

        if (isCancel(input)) {
          cancel('Operation cancelled')
          process.exit(1)
        }

        dir = input
      }
    }

    dir = resolvePath(dir)

    const app = config.apps.find((app) => app.path === dir)

    if (!app) {
      logger.error(`The app at ${colors.gray(dir)} is not registered.`)
      process.exit(1)
    }

    if (!fs.existsSync(dir)) {
      logger.error(`The directory ${colors.gray(dir)} does not exist.`)
      process.exit(1)
    }

    if (!getAppInfo(dir)) {
      logger.error(`The directory ${colors.yellow(dir)} is not a valid Pruvious Hub app.`)
      process.exit(1)
    }

    if (!isPositiveInteger(port) || port < 1 || port > 65535) {
      logger.error(`The specified port ${colors.gray(ctx.args.port)} is not valid.`)
      process.exit(1)
    }

    if (ctx.args.port && !(await checkPort(port))) {
      logger.error(`Port ${colors.gray(ctx.args.port)} is already in use.`)
      process.exit(1)
    }

    const availablePort = await getPort({ portRange: [port, 65535] })
    const server = execa('node', ['server/index.mjs'], {
      cwd: dir,
      env: {
        PORT: availablePort.toString(),
        NUXT_PRUVIOUS_AUTH_JWT_SECRET: app.secret,
        PRUVIOUS_HUB_MASTER_KEY: app.masterKey,
        NODE_ENV: 'production',
      },
      stdout: 'pipe',
    })

    let firstLineConsumed = false

    server.stdout.on('data', (data) => {
      if (!firstLineConsumed) {
        const output = data.toString()
        const match = output.match(/Listening on http:\/\/(.+?):(\d+)/)

        if (match) {
          const host = match[1] === '[::]' ? 'localhost' : match[1]
          const port = match[2]
          logger.success(`Pruvious Hub app is running at ${colors.greenBright(`http://${host}:${port}`)}`)
          return
        }
      }

      process.stdout.write(data)
    })
  },
})
