import { ColumnRecords, QueryableField } from './types'

/*
|--------------------------------------------------------------------------
| Uploads
|--------------------------------------------------------------------------
|
*/

export const standardUploadFields: QueryableField[] = [
  {
    name: 'id',
    type: 'number',
    label: 'ID',
  },
  {
    name: 'path',
    type: 'text',
  },
  {
    name: 'mime',
    type: 'text',
    label: 'MIME type',
  },
  {
    name: 'kind',
    type: 'text',
  },
  {
    name: 'name',
    type: 'text',
  },
  {
    name: 'directoryId',
    type: 'number',
  },
  {
    name: 'description',
    type: 'text',
  },
  {
    name: 'info',
    type: 'text',
    sortable: false,
    filterable: false,
  },
  {
    name: 'size',
    type: 'number',
  },
  {
    name: 'thumbnail',
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

export const standardUploadColumns: ColumnRecords = {
  id: 'number',
  path: 'string',
  mime: 'string',
  kind: 'string',
  name: 'string',
  directoryId: 'number',
  description: 'string',
  info: 'json',
  size: 'number',
  thumbnail: 'string',
  createdAt: 'dateTime',
  updatedAt: 'dateTime',
}

export const reservedUploadColumns: ColumnRecords = {
  ...standardUploadColumns,
  hash: 'string',
  checkedAt: 'dateTime',
  directory: 'json',
  url: 'string',
  meta: 'json',
  file: 'json',
  translationId: 'number',
  translations: 'json',
}

export const creatableStandardUploadColumns: string[] = ['name', 'directoryId', 'description']

export const updateableStandardUploadColumns: string[] = ['name', 'directoryId', 'description']
