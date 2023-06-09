import { ColumnRecords, QueryableField } from './types'

/*
|--------------------------------------------------------------------------
| Roles
|--------------------------------------------------------------------------
|
*/

export const standardRoleFields: QueryableField[] = [
  {
    name: 'id',
    type: 'number',
    label: 'ID',
  },
  {
    name: 'name',
    type: 'text',
    required: true,
  },
  {
    name: 'capabilities',
    type: 'checkboxes',
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

export const standardRoleColumns: ColumnRecords = {
  id: 'number',
  name: 'string',
  capabilities: 'json',
  createdAt: 'dateTime',
  updatedAt: 'dateTime',
}

export const reservedRoleColumns: ColumnRecords = {
  ...standardRoleColumns,
  users: 'json',
  translationId: 'number',
  translations: 'json',
}

export const creatableStandardRoleColumns: string[] = ['name', 'capabilities']

export const updateableStandardRoleColumns: string[] = ['name', 'capabilities']
