import { colors, logger } from '@pruvious/cli-utils'

export function showNoRegisteredAppsMessages() {
  logger.info('No Pruvious Hub apps are registered.')
  logger.message(
    [
      `${colors.gray('Install a new app with:')} ${colors.cyan('npx @pruvious/hub install <dir>')}`,
      `${colors.gray('Register existing apps with:')} ${colors.cyan('npx @pruvious/hub add <dir>')}`,
    ].join('\n'),
  )
}
