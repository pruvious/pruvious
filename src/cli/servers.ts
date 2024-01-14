import { defineCommand } from 'citty'

export default defineCommand({
  meta: {
    name: 'servers',
    description: 'Manage remote servers',
  },
  subCommands: {
    add: () => import('./servers/add.js').then((r) => r.default),
    list: () => import('./servers/list.js').then((r) => r.default),
    remove: () => import('./servers/remove.js').then((r) => r.default),
  },
})
