import type { CommandDef } from 'citty'

const rDefault = (r: any) => (r.default || r) as Promise<CommandDef>

export const commands = {
  build: () => import('./build').then(rDefault),
} as const
