import { ColumnRecords, QueryableField } from './types'

/*
|--------------------------------------------------------------------------
| Users
|--------------------------------------------------------------------------
|
*/

export const standardUserFields: QueryableField[] = [
  {
    name: 'id',
    type: 'number',
    label: 'ID',
  },
  {
    name: 'email',
    type: 'text',
    required: true,
  },
  {
    name: 'dateFormat',
    type: 'text',
  },
  {
    name: 'timeFormat',
    type: 'text',
  },
  {
    name: 'capabilities',
    type: 'checkboxes',
  },
  {
    name: 'role',
    type: 'role',
    label: 'Role',
  },
  {
    name: 'isAdmin',
    type: 'switch',
    label: 'Administrator',
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

export const standardUserColumns: ColumnRecords = {
  id: 'number',
  email: 'string',
  dateFormat: 'string',
  timeFormat: 'string',
  capabilities: 'json',
  role: 'number',
  isAdmin: 'boolean',
  createdAt: 'dateTime',
  updatedAt: 'dateTime',
}

export const reservedUserColumns: ColumnRecords = {
  ...standardUserColumns,
  password: 'string',
  checkedAt: 'dateTime',
  combinedCapabilities: 'json',
  meta: 'json',
  translationId: 'number',
  translations: 'json',
}

export const creatableStandardUserColumns: string[] = [
  'email',
  'password',
  'dateFormat',
  'timeFormat',
  'role',
  'capabilities',
  'isAdmin',
]

export const updateableStandardUserColumns: string[] = [
  'email',
  'password',
  'dateFormat',
  'timeFormat',
  'role',
  'capabilities',
  'isAdmin',
]
