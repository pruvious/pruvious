import {
  Block,
  Collection,
  Config,
  Pages,
  Presets,
  Roles,
  Settings,
  Uploads,
  Users,
  Validator,
} from '@pruvious/shared'
import { Action } from 'App/Controllers/Http/ActionsController'

export const config: Config = {
  languages: [{ code: 'en', label: 'English' }],
}

export const pageConfig: Pages = {
  labels: {
    title: { singular: 'Page', plural: 'Pages' },
    item: { singular: 'Page', plural: 'Pages' },
  },
  listing: {
    fields: ['title:30', 'path:30', 'public', 'createdAt', 'publishDate'],
  },
  types: {
    default: {},
  },
  search: ['title', 'path', 'description', 'blocks'],
  perPageLimit: 50,
  icon: 'note',
}

export const presetConfig: Presets = {
  labels: {
    title: { singular: 'Preset', plural: 'Presets' },
    item: { singular: 'Preset', plural: 'Presets' },
  },
  listing: {
    fields: ['title', 'createdAt'],
    sort: [{ field: 'createdAt', direction: 'desc' }],
  },
  search: ['title', 'blocks'],
  perPageLimit: 50,
  icon: 'transform',
}

export const uploadConfig: Uploads = {
  labels: {
    title: { singular: 'Media', plural: 'Media' },
  },
  uploadLimit: '16MB',
  search: ['name', 'path', 'mime', 'description'],
  icon: 'photo',
}

export const collectionsConfig: Record<string, Collection> = {}

export const roleConfig: Roles = {
  labels: {
    title: { singular: 'Role', plural: 'Roles' },
    item: { singular: 'Role', plural: 'Roles' },
  },
  listing: {
    fields: ['name', 'capabilities:50', 'createdAt'],
    sort: [{ field: 'name', direction: 'asc' }],
  },
  search: ['name', 'capabilities'],
  perPageLimit: 50,
  icon: 'shield',
}

export const userConfig: Users = {
  labels: {
    title: { singular: 'User', plural: 'Users' },
    item: { singular: 'User', plural: 'Users' },
  },
  listing: {
    fields: ['email', 'firstName', 'lastName', 'role', 'isAdmin', 'createdAt'],
    sort: [{ field: 'email', direction: 'asc' }],
  },
  fields: [
    { name: 'firstName', type: 'text' },
    { name: 'lastName', type: 'text' },
  ],
  search: ['email', 'firstName', 'lastName'],
  perPageLimit: 50,
  icon: 'users',
}

export const actions: Record<string, Action> = {}

export const blocks: Block[] = []

export const settingConfigs: Settings[] = []

export const redirects: {
  match: string | RegExp
  redirectTo: string
  isPermanent: boolean
  external: boolean
}[] = []

export const validators: Record<string, Validator> = {}

export const icons: Record<string, string> = {}
