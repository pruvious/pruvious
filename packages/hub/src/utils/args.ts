import type { ArgDef } from 'citty'
import { getDefaultConfigPath } from './config'

export const sharedArgs = {
  cwd: {
    type: 'string',
    description: 'Current working directory.',
    valueHint: 'directory',
    default: '.',
  },
  config: {
    type: 'string',
    description: `Path for storing the Pruvious Hub global configuration file (default: \`${getDefaultConfigPath()}\`).`,
    valueHint: 'path',
    default: '',
  },
} as const satisfies Record<string, ArgDef>
