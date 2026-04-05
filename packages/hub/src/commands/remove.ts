import { cancel, isCancel, select } from '@clack/prompts'
import { colors, logger, resolvePath } from '@pruvious/cli-utils'
import { defineCommand } from 'citty'
import fs from 'node:fs'
import { sharedArgs } from '../utils/args'
import { readConfigFile, writeConfigFile } from '../utils/config'
import { getAppInfo } from '../utils/hub'
import { showNoRegisteredAppsMessages } from '../utils/messages'

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
    let dir = ctx.args.dir

    if (!dir) {
      if (!config.apps.length) {
        showNoRegisteredAppsMessages()
        process.exit(0)
      }

      const input = await select({
        message: 'Choose the Pruvious Hub app to remove:',
        options: config.apps.map((app) => ({ label: app.path, value: app.path })),
        initialValue: config.apps[0].path,
      })

      if (isCancel(input)) {
        cancel('Operation cancelled')
        process.exit(1)
      }

      dir = input
    }

    dir = resolvePath(dir)

    if (!config.apps.some((app) => app.path === dir)) {
      logger.error(`The app at ${colors.gray(dir)} is not registered.`)
      process.exit(1)
    }

    config.apps = config.apps.filter((app) => app.path !== dir)
    writeConfigFile(config)
    logger.success(`The app ${colors.greenBright(dir)} has been removed from the registry.`)

    if (!ctx.args.soft) {
      try {
        if (!fs.existsSync(dir)) {
          logger.warning(`The directory ${colors.yellow(dir)} does not exist.`)
          throw new Error()
        }

        if (!getAppInfo(dir)) {
          logger.warning(`The directory ${colors.yellow(dir)} is not a valid Pruvious Hub app.`)
          throw new Error()
        }

        fs.rmSync(dir, { recursive: true, force: true })
        logger.success('All app files have been removed.')
      } catch {
        logger.info('The app files could not be removed.')
        process.exit(0)
      }
    }
  },
})
