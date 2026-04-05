import { box, cancel, isCancel, select, spinner, text } from '@clack/prompts'
import { colors, isValidPath, logger, resolvePath } from '@pruvious/cli-utils'
import { generateSecureRandomString } from '@pruvious/utils'
import { defineCommand } from 'citty'
import { resolvePath as resolveModulePath } from 'mlly'
import fs from 'node:fs'
import { installDependencies } from 'nypm'
import { join, resolve } from 'pathe'
import { sharedArgs } from '../utils/args'
import { readConfigFile, writeConfigFile } from '../utils/config'
import { updateApp } from '../utils/updater'

export default defineCommand({
  meta: {
    name: 'install',
    description: 'Install a new Pruvious Hub app on this machine.',
  },
  args: {
    ...sharedArgs,
    dir: {
      type: 'positional',
      description: 'The directory where the Pruvious Hub app will be installed.',
      default: '',
    },
    force: {
      type: 'boolean',
      description: 'Clear the target directory if it already exists.',
      default: false,
    },
    update: {
      type: 'boolean',
      description: 'Update the app if it is already installed.',
      default: false,
    },
  },
  async run(ctx) {
    const config = readConfigFile()
    const hubPackageMain = await resolveModulePath('@pruvious/hub-app', { url: import.meta.url })
    const hubPackageDist = resolve(hubPackageMain, '..', '..')

    if (!fs.existsSync(hubPackageMain)) {
      logger.error(`Cannot find Pruvious Hub package main at: ${colors.gray(hubPackageMain)}`)
      process.exit(1)
    }

    let dir = ctx.args.dir
    let dirResolved = false
    let initialDir = resolvePath(ctx.args.cwd)

    while (!dirResolved) {
      if (!dir) {
        const input = await text({
          message: 'Where do you want to install the Pruvious Hub app?',
          initialValue: initialDir,
          validate: (value) => {
            if (!value?.trim()) {
              return 'The path cannot be empty'
            } else if (!isValidPath(value)) {
              return 'Invalid path'
            } else if (fs.existsSync(resolvePath(value)) && fs.statSync(resolvePath(value)).isFile()) {
              return 'Please select a directory, not a file'
            }
          },
        })

        if (isCancel(input)) {
          cancel('Operation cancelled')
          process.exit(1)
        }

        dir = input
      }

      dir = resolvePath(dir)

      if (!ctx.args.force && fs.existsSync(dir)) {
        const action = await select({
          message: `The directory ${colors.cyan(dir)} already exists. What would you like to do?`,
          options: [
            { value: 'override', label: 'Override its contents' },
            { value: 'different', label: 'Select different directory' },
            { value: 'abort', label: 'Abort' },
          ],
        })

        if (isCancel(action)) {
          cancel('Operation cancelled')
          process.exit(1)
        }

        if (action === 'different') {
          initialDir = dir
          dir = ''
          continue
        } else if (action === 'abort') {
          process.exit(1)
        }
      }

      dirResolved = true
    }

    if (!ctx.args.force && fs.existsSync(dir) && config.apps.some((app) => app.path === dir)) {
      if (ctx.args.update) {
        await updateApp(dir)
        process.exit(0)
      }

      const action = await select({
        message: `The app at ${colors.yellow(dir)} is already registered. What would you like to do?`,
        options: [
          { value: 'update', label: 'Update to latest version' },
          { value: 'override', label: 'Replace contents (will delete all app data)' },
          { value: 'abort', label: 'Abort' },
        ],
      })

      if (isCancel(action)) {
        cancel('Operation cancelled')
        process.exit(1)
      }

      if (action === 'update') {
        await updateApp(dir)
        process.exit(0)
      } else if (action === 'abort') {
        process.exit(1)
      }
    }

    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true })
    }

    const copySpinner = spinner()
    copySpinner.start('Copying files')
    fs.mkdirSync(dir, { recursive: true })
    fs.cpSync(hubPackageDist, dir, { recursive: true })
    copySpinner.stop('Files copied.')

    const installSpinner = spinner()
    installSpinner.start('Installing dependencies')
    await installDependencies({ cwd: join(dir, 'server'), packageManager: 'npm', silent: true })
    installSpinner.stop('Dependencies installed.')

    if (!config.apps.some((app) => app.path === dir)) {
      config.apps.push({ path: dir, secret: generateSecureRandomString() })
      writeConfigFile(config)
    }

    logger.success('Pruvious Hub app installed successfully!')
    console.log('')
    box(`\n${colors.cyan('npx @pruvious/hub start')}\n`, ` Next step `, {
      contentAlign: 'left',
      titleAlign: 'left',
      width: 'auto',
      contentPadding: 3,
      rounded: true,
      withGuide: false,
    })
  },
})
