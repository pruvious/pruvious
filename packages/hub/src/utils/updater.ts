import { spinner } from '@clack/prompts'
import { colors } from 'consola/utils'
import { resolvePath as resolveModulePath } from 'mlly'
import fs from 'node:fs'
import { resolve } from 'pathe'
import { eq, valid } from 'semver'
import packageJSON from '../../package.json' with { type: 'json' }
import { getAppInfo } from './hub'
import { logger } from './logger'

export async function updateApp(path: string) {
  const hubPackageMain = await resolveModulePath('@pruvious/hub-app', { url: import.meta.url })
  const hubPackageDist = resolve(hubPackageMain, '..', '..')

  if (!fs.existsSync(hubPackageMain)) {
    logger.error(`Cannot find Pruvious Hub package main at: ${colors.gray(hubPackageMain)}`)
    process.exit(1)
  }

  const currentVersion = getAppInfo(path)?.version
  const latestVersion = packageJSON.dependencies['@pruvious/hub-app'] as string

  if (!currentVersion || !valid(currentVersion)) {
    logger.error(`Cannot determine the current version of the Pruvious Hub app at ${colors.gray(path)}.`)
    process.exit(1)
  }

  if (valid(latestVersion) && eq(currentVersion, latestVersion)) {
    logger.info(
      `The Pruvious Hub app at ${colors.cyan(path)} is already up to date (version ${colors.cyan(currentVersion)}).`,
    )
    process.exit(0)
  }

  const updateSpinner = spinner()
  updateSpinner.start('Copying files')
  fs.cpSync(hubPackageDist, path, { recursive: true, force: true })

  updateSpinner.stop('Files copied.')
  logger.success(
    `Pruvious Hub app updated successfully from version ${colors.gray(currentVersion)} to ${colors.greenBright(latestVersion)}.`,
  )
}
