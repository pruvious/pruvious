import { cancel, isCancel, select } from '@clack/prompts'
import { defineCommand } from 'citty'
import { colors } from 'consola/utils'
import fs from 'node:fs'
import { sharedArgs } from '../utils/args'
import { readConfigFile, writeConfigFile } from '../utils/config'
import { getAppInfo } from '../utils/hub'
import { logger } from '../utils/logger'
import { showNoRegisteredAppsMessages } from '../utils/messages'
import { resolvePath } from '../utils/path'

export default defineCommand({
  meta: {
    name: 'remove',
    description: 'Remove a Pruvious Hub app from the registry.',
  },
  args: {
    ...sharedArgs,
    dir: {
      type: 'positional',
      description: 'Path to an existing Pruvious Hub app.',
      default: '',
    },
    soft: {
      type: 'boolean',
      description: 'Only remove the app from the registry without deleting its files.',
      default: false,
    },
  },
  async run(ctx) {
    const config = readConfigFile()

    if (!ctx.args.dir) {
      if (!config.apps.length) {
        showNoRegisteredAppsMessages()
        process.exit(0)
      }

      const dir = await select({
        message: 'Choose the Pruvious Hub app to remove:',
        options: config.apps.map((app) => ({ label: app.path, value: app.path })),
        initialValue: config.apps[0].path,
      })

      if (isCancel(dir)) {
        cancel('Operation cancelled')
        process.exit(1)
      }

      ctx.args.dir = dir
    }

    ctx.args.dir = resolvePath(ctx.args.dir)

    if (!config.apps.some((app) => app.path === ctx.args.dir)) {
      logger.error(`The app at ${colors.gray(ctx.args.dir)} is not registered.`)
      process.exit(1)
    }

    config.apps = config.apps.filter((app) => app.path !== ctx.args.dir)
    writeConfigFile(config)
    logger.success(`The app ${colors.greenBright(ctx.args.dir)} has been removed from the registry.`)

    if (!ctx.args.soft) {
      try {
        if (!fs.existsSync(ctx.args.dir)) {
          logger.warning(`The directory ${colors.yellow(ctx.args.dir)} does not exist.`)
          throw new Error()
        }

        if (!getAppInfo(ctx.args.dir)) {
          logger.warning(`The directory ${colors.yellow(ctx.args.dir)} is not a valid Pruvious Hub app.`)
          throw new Error()
        }

        fs.rmSync(ctx.args.dir, { recursive: true, force: true })
        logger.success('All app files have been removed.')
      } catch {
        logger.info('The app files could not be removed.')
        process.exit(0)
      }
    }
  },
})
