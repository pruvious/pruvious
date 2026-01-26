import type { CommandDef } from 'citty'

const rDefault = (r: any) => (r.default || r) as Promise<CommandDef>

export const commands = {
  add: () => import('./add').then(rDefault),
  list: () => import('./list').then(rDefault),
  install: () => import('./install').then(rDefault),
  remove: () => import('./remove').then(rDefault),
  start: () => import('./start').then(rDefault),
  update: () => import('./update').then(rDefault),
} as const
