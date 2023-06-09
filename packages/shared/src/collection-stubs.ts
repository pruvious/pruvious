import { ColumnRecords, QueryableField } from './types'

/*
|--------------------------------------------------------------------------
| Collections
|--------------------------------------------------------------------------
|
*/

export const standardCollectionFields: QueryableField[] = [
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
    name: 'language',
    type: 'select',
  },
  {
    name: 'translationId',
    type: 'number',
    label: 'Translations',
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

export const standardCollectionColumns: ColumnRecords = {
  id: 'number',
  public: 'boolean',
  language: 'string',
  translationId: 'number',
  publishDate: 'dateTime',
  createdAt: 'dateTime',
  updatedAt: 'dateTime',
}

export const reservedCollectionColumns: ColumnRecords = {
  ...standardCollectionColumns,
  collection: 'string',
  checkedAt: 'dateTime',
  meta: 'json',
  translations: 'json',
}

export const creatableStandardCollectionColumns: string[] = [
  'public',
  'language',
  'translationOf',
  'publishDate',
]

export const updateableStandardCollectionColumns: string[] = ['public', 'publishDate']
