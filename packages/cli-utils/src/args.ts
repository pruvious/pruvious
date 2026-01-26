import type { ArgDef } from 'citty'

export const sharedArgs = {
  cwd: {
    type: 'string',
    description: 'Current working directory.',
    valueHint: 'directory',
    default: '.',
  },
} as const satisfies Record<string, ArgDef>
