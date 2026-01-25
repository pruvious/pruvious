import { logger } from '@pruvious/cli-utils'
import { defineCommand } from 'citty'
import { sharedArgs } from '../utils/args'
import { readConfigFile } from '../utils/config'
import { showNoRegisteredAppsMessages } from '../utils/messages'

export default defineCommand({
  meta: {
    name: 'list',
    description: 'List all installed Pruvious Hub apps on this machine.',
  },
  args: {
    ...sharedArgs,
  },
  async run() {
    const config = readConfigFile()

    if (config.apps.length) {
      logger.info('Registered Pruvious Hub apps:')
      for (const app of config.apps) {
        logger.step(app.path)
      }
    } else {
      showNoRegisteredAppsMessages()
    }
  },
})
