import { sharedArgs as _sharedArgs } from '@pruvious/cli-utils'
import type { ArgDef } from 'citty'
import { getDefaultConfigPath } from './config'

export const sharedArgs = {
  ..._sharedArgs,
  config: {
    type: 'string',
    description: `Path for storing the Pruvious Hub global configuration file (default: \`${getDefaultConfigPath()}\`).`,
    valueHint: 'path',
    default: '',
  },
} as const satisfies Record<string, ArgDef>
