import { ColumnRecords, QueryableField } from './types'

/*
|--------------------------------------------------------------------------
| Pages
|--------------------------------------------------------------------------
|
*/

export const standardPageFields: QueryableField[] = [
  {
    name: 'id',
    type: 'number',
    label: 'ID',
  },
  {
    name: 'public',
    type: 'switch',
    label: 'Status',
    trueLabel: 'Public',
    falseLabel: 'Draft',
  },
  {
    name: 'path',
    type: 'text',
    required: true,
  },
  {
    name: 'language',
    type: 'select',
  },
  {
    name: 'translationId',
    type: 'number',
    label: 'Translations',
  },
  {
    name: 'title',
    type: 'text',
    emptyOrNull: 'Untitled',
  },
  {
    name: 'baseTitle',
    type: 'switch',
    falseLabel: 'Hidden',
    trueLabel: 'Visible',
  },
  {
    name: 'description',
    type: 'text',
  },
  {
    name: 'visible',
    label: 'Search engine visibility',
    type: 'switch',
    falseLabel: 'Hidden',
    trueLabel: 'Visible',
  },
  {
    name: 'sharingImage',
    type: 'image',
    minWidth: 1200,
    minHeight: 630,
    allow: ['gif', 'jpg', 'png', 'webp'],
    sources: [{ width: 1200, height: 630, quality: 90 }],
  },
  {
    name: 'metaTags',
    type: 'repeater',
    subFields: [
      {
        name: 'name',
        type: 'text',
        suggestions: [
          'author',
          'color-scheme',
          'creator',
          'description',
          'generator',
          'googlebot',
          'keywords',
          'publisher',
          'referrer',
          'robots',
          'theme-color',
          'viewport',
        ],
        required: true,
        placeholder: 'e.g. author',
      },
      {
        name: 'content',
        type: 'text',
        required: true,
        placeholder: 'e.g. John Doe',
      },
    ],
  },
  {
    name: 'type',
    type: 'select',
  },
  {
    name: 'layout',
    type: 'select',
  },
  {
    name: 'blocks',
    type: 'text',
    sortable: false,
    filterable: false,
  },
  {
    name: 'publishDate',
    type: 'dateTime',
  },
  {
    name: 'createdAt',
    type: 'dateTime',
  },
  {
    name: 'updatedAt',
    type: 'dateTime',
  },
]

export const standardPageColumns: ColumnRecords = {
  id: 'number',
  public: 'boolean',
  path: 'string',
  language: 'string',
  translationId: 'number',
  title: 'string',
  baseTitle: 'boolean',
  description: 'string',
  sharingImage: 'number',
  metaTags: 'json',
  visible: 'boolean',
  type: 'string',
  layout: 'string',
  blocks: 'json',
  publishDate: 'dateTime',
  createdAt: 'dateTime',
  updatedAt: 'dateTime',
}

export const reservedPageColumns: ColumnRecords = {
  ...standardPageColumns,
  cache: 'json',
  draftToken: 'string',
  checkedAt: 'dateTime',
  url: 'string',
  meta: 'json',
  translations: 'json',
  redirectTo: 'string',
  redirectCode: 'number',
}

export const creatableStandardPageColumns: string[] = [
  'public',
  'path',
  'language',
  'translationOf',
  'title',
  'baseTitle',
  'description',
  'visible',
  'sharingImage',
  'metaTags',
  'type',
  'layout',
  'blocks',
  'publishDate',
]

export const updateableStandardPageColumns: string[] = [
  'public',
  'path',
  'title',
  'baseTitle',
  'description',
  'visible',
  'sharingImage',
  'metaTags',
  'type',
  'layout',
  'blocks',
  'publishDate',
]
