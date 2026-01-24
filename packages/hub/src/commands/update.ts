import { cancel, isCancel, select } from '@clack/prompts'
import { resolvePath } from '@pruvious/cli-utils'
import { defineCommand } from 'citty'
import { colors } from 'consola/utils'
import { sharedArgs } from '../utils/args'
import { readConfigFile } from '../utils/config'
import { logger } from '../utils/logger'
import { showNoRegisteredAppsMessages } from '../utils/messages'
import { updateApp } from '../utils/updater'

export default defineCommand({
  meta: {
    name: 'update',
    description: 'Update an existing Pruvious Hub app to the latest version.',
  },
  args: {
    ...sharedArgs,
    dir: {
      type: 'positional',
      description: 'Path to an existing Pruvious Hub app.',
      default: '',
    },
  },
  async run(ctx) {
    const config = readConfigFile()

    if (!ctx.args.dir) {
      if (!config.apps.length) {
        showNoRegisteredAppsMessages()
        process.exit(0)
      }

      if (config.apps.length === 1) {
        ctx.args.dir = config.apps[0].path
      } else {
        const dir = await select({
          message: 'Choose the Pruvious Hub app to update:',
          options: config.apps.map((app) => ({ label: app.path, value: app.path })),
          initialValue: config.apps[0].path,
        })

        if (isCancel(dir)) {
          cancel('Operation cancelled')
          process.exit(1)
        }

        ctx.args.dir = dir
      }
    }

    ctx.args.dir = resolvePath(ctx.args.dir)

    if (!config.apps.some((app) => app.path === ctx.args.dir)) {
      logger.error(`The app at ${colors.gray(ctx.args.dir)} is not registered.`)
      process.exit(1)
    }

    await updateApp(ctx.args.dir)
  },
})
