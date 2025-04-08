import type { CollectionMeta } from './define'

export const privateCollectionMeta: CollectionMeta = {
  translatable: false as never,
  syncedFields: [],
  api: { create: false, read: false, update: false, delete: false },
  guards: [],
  authGuard: [],
  duplicate: null,
  copyTranslation: null,
  logs: { enabled: true, exposeData: true, operations: { insert: true, select: true, update: true, delete: true } },
  createdAt: { enabled: false } as any,
  updatedAt: { enabled: false } as any,
  author: { enabled: false } as any,
  editors: { enabled: false } as any,
  ui: {
    hidden: true,
    label: '',
    menu: { hidden: true, group: 'general', order: 10, icon: 'folder' },
    indexPage: { dashboardLayout: 'default', table: { columns: undefined, orderBy: undefined, perPage: 50 } },
    createPage: { dashboardLayout: 'auto', fieldsLayout: undefined },
    updatePage: { dashboardLayout: 'auto', fieldsLayout: undefined },
  },
}
