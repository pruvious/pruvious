import {
  defineCollection,
  denyGroupBy,
  denyOrderBy,
  denyWhere,
  maskFields,
  selectField,
  textAreaField,
  textField,
  timestampField,
} from '#pruvious/server'
import { secretField } from '../utils/secretField'

export default defineCollection({
  fields: {
    name: textField({
      required: true,
      unique: {
        caseSensitive: false,
      },
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Secret name'),
        placeholder: 'cf-prod-token',
      },
    }),
    type: selectField({
      default: 'api-token',
      choices: [
        { value: 'api-token', label: ({ __ }) => __('pruvious-dashboard', 'API token') },
        { value: 'ssh-key', label: ({ __ }) => __('pruvious-dashboard', 'SSH key') },
        { value: 'password', label: ({ __ }) => __('pruvious-dashboard', 'Password') },
        { value: 'generic', label: ({ __ }) => __('pruvious-dashboard', 'Generic') },
      ],
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Secret type'),
      },
    }),
    value: secretField({
      required: true,
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Value'),
        placeholder: ({ __ }) => __('pruvious-dashboard', '••••••  blank = keep'),
        description: ({ __ }) => __('pruvious-dashboard', 'Secret value (write-only, stored encrypted)'),
      },
    }),
    description: textAreaField({
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Description'),
      },
    }),
    lastUsedAt: timestampField({
      ui: {
        hidden: true,
        label: ({ __ }) => __('pruvious-dashboard', 'Last used'),
      },
    }),
  },
  hooks: {
    beforeQueryPreparation: [denyWhere(['value']), denyOrderBy(['value']), denyGroupBy(['value'])],
    afterQueryExecution: [maskFields(['value'])],
  },
  translatable: false,
  ui: {
    label: ({ __ }) => __('pruvious-dashboard', 'Secrets'),
    icon: 'key',
    menu: {
      group: 'management',
      order: 50,
    },
    indexPage: {
      dataTable: {
        columns: ['name', 'type | 140px', 'description', 'lastUsedAt | 160px'],
        orderBy: 'name:asc',
      },
    },
  },
})
