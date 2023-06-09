import { ColumnRecords, QueryableField } from './types'

/*
|--------------------------------------------------------------------------
| Presets
|--------------------------------------------------------------------------
|
*/

export const standardPresetFields: QueryableField[] = [
  {
    name: 'id',
    type: 'number',
    label: 'ID',
  },
  {
    name: 'language',
    type: 'text',
  },
  {
    name: 'translationId',
    type: 'number',
    label: 'Translations',
  },
  {
    name: 'title',
    type: 'text',
    required: true,
  },
  {
    name: 'blocks',
    type: 'text',
    sortable: false,
    filterable: false,
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

export const standardPresetColumns: ColumnRecords = {
  id: 'number',
  translationId: 'number',
  language: 'string',
  title: 'string',
  blocks: 'json',
  createdAt: 'dateTime',
  updatedAt: 'dateTime',
}

export const reservedPresetColumns: ColumnRecords = {
  ...standardPresetColumns,
  checkedAt: 'dateTime',
  translations: 'json',
}

export const creatableStandardPresetColumns: string[] = [
  'language',
  'translationOf',
  'title',
  'blocks',
]

export const updateableStandardPresetColumns: string[] = ['title', 'blocks']
