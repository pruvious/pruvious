import { colors } from '@pruvious/cli-utils'
import process from 'node:process'
import { logger } from './logger'
import { satisfiesVersion } from './version'

export async function checkEngines() {
  const currentNode = process.versions.node
  const nodeRange = '>= 24.0.0'

  if (!satisfiesVersion(currentNode, nodeRange)) {
    logger.warn(
      `Current version of Node.js (${colors.cyan(currentNode)}) is unsupported and might cause issues.\n       Please upgrade to a compatible version ${colors.cyan(nodeRange)}.`,
    )
  }
}
