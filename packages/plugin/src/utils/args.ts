import { sharedArgs as _sharedArgs } from '@pruvious/cli-utils'
import type { ArgDef } from 'citty'

export const sharedArgs = {
  ..._sharedArgs,
} as const satisfies Record<string, ArgDef>
