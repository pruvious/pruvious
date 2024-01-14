import { defineCommand } from 'citty'

export default defineCommand({
  meta: {
    name: 'sites',
    description: 'Manage production sites',
  },
  subCommands: {
    add: () => import('./sites/add.js').then((r) => r.default),
    list: () => import('./sites/list.js').then((r) => r.default),
    remove: () => import('./sites/remove.js').then((r) => r.default),
  },
})
