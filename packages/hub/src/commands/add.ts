import { cancel, isCancel, text } from '@clack/prompts'
import { colors, isValidPath, logger, resolvePath } from '@pruvious/cli-utils'
import { generateSecureRandomString } from '@pruvious/utils'
import { defineCommand } from 'citty'
import fs from 'node:fs'
import { sharedArgs } from '../utils/args'
import { readConfigFile, writeConfigFile } from '../utils/config'
import { getAppInfo } from '../utils/hub'

export default defineCommand({
  meta: {
    name: 'add',
    description: 'Add an existing Pruvious Hub app to the registry.',
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
    if (!ctx.args.dir) {
      const dir = await text({
        message: 'Enter the path to an existing Pruvious Hub app:',
        initialValue: resolvePath(ctx.args.cwd),
        validate: (value) => {
          if (!value?.trim()) {
            return 'The path cannot be empty'
          } else if (!isValidPath(value)) {
            return 'Invalid path'
          } else if (fs.statSync(resolvePath(value)).isFile()) {
            return 'Please select a directory, not a file'
          } else if (!fs.existsSync(resolvePath(value))) {
            return 'The directory does not exist'
          } else if (!getAppInfo(resolvePath(value))) {
            return 'The directory is not a valid Pruvious Hub app'
          }
        },
      })

      if (isCancel(dir)) {
        cancel('Operation cancelled')
        process.exit(1)
      }

      ctx.args.dir = dir
    }

    ctx.args.dir = resolvePath(ctx.args.dir)

    if (!fs.existsSync(ctx.args.dir)) {
      logger.error(`The directory ${colors.gray(ctx.args.dir)} does not exist.`)
      process.exit(1)
    }

    if (!getAppInfo(ctx.args.dir)) {
      logger.error(`The directory ${colors.gray(ctx.args.dir)} is not a valid Pruvious Hub app.`)
      process.exit(1)
    }

    const config = readConfigFile()

    if (config.apps.some((app) => app.path === ctx.args.dir)) {
      logger.warning(`The app at ${colors.yellow(ctx.args.dir)} is already registered.`)
      process.exit(0)
    }

    config.apps.push({ path: ctx.args.dir, secret: generateSecureRandomString() })
    writeConfigFile(config)
    logger.success(`Successfully registered the app at ${colors.greenBright(ctx.args.dir)}.`)
  },
})
