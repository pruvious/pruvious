import { spinner } from '@clack/prompts'
import { colors, isValidVersion, logger, satisfiesVersion } from '@pruvious/cli-utils'
import { resolvePath as resolveModulePath } from 'mlly'
import fs from 'node:fs'
import { installDependencies } from 'nypm'
import { join, resolve } from 'pathe'
import packageJSON from '../../package.json' with { type: 'json' }
import { getAppInfo } from './hub'

export async function updateApp(path: string) {
  const hubPackageMain = await resolveModulePath('@pruvious/hub-app', { url: import.meta.url })
  const hubPackageDist = resolve(hubPackageMain, '..', '..')

  if (!fs.existsSync(hubPackageMain)) {
    logger.error(`Cannot find Pruvious Hub package main at: ${colors.gray(hubPackageMain)}`)
    process.exit(1)
  }

  const currentVersion = getAppInfo(path)?.version
  const latestVersion = packageJSON.dependencies['@pruvious/hub-app'] as string

  if (!currentVersion || !isValidVersion(currentVersion)) {
    logger.error(`Cannot determine the current version of the Pruvious Hub app at ${colors.gray(path)}.`)
    process.exit(1)
  }

  if (isValidVersion(latestVersion) && (await satisfiesVersion(currentVersion, latestVersion))) {
    logger.info(
      `The Pruvious Hub app at ${colors.cyan(path)} is already up to date (version ${colors.cyan(currentVersion)}).`,
    )
    process.exit(0)
  }

  const updateSpinner = spinner()
  updateSpinner.start('Copying files')
  fs.cpSync(hubPackageDist, path, { recursive: true, force: true })
  updateSpinner.stop('Files copied.')

  const installSpinner = spinner()
  installSpinner.start('Installing dependencies')
  await installDependencies({ cwd: join(path, 'server'), packageManager: 'npm', silent: true })
  installSpinner.stop('Dependencies installed.')

  logger.success(
    `Pruvious Hub app updated successfully from version ${colors.gray(currentVersion)} to ${colors.greenBright(latestVersion)}.`,
  )
}
