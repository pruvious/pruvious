import { defineCollection, recordsField, textField, trueFalseField } from '#pruvious/server'
import { denyDuplicateEnvVarKey } from '../utils/denyDuplicateEnvVarKey'
import { secretField } from '../utils/secretField'

export default defineCollection({
  fields: {
    targets: recordsField({
      collection: 'DeploymentTargets',
      required: true,
      fields: ['id', 'name', 'type'],
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Deployment targets'),
        placeholder: ({ __ }) => __('pruvious-dashboard', 'Select deployment targets'),
        displayFields: ['name', 'type'],
        searchFields: ['name'],
      },
    }),
    key: textField({
      required: true,
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Key'),
        placeholder: 'NUXT_PUBLIC_API_BASE',
        description: ({ __ }) =>
          __('pruvious-dashboard', 'Variable name available to the build and runtime. Convention: `UPPER_SNAKE_CASE`.'),
      },
    }),
    value: secretField({
      required: true,
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Value'),
        placeholder: ({ __ }) => __('pruvious-dashboard', '••••••  blank = keep'),
        description: ({ __ }) =>
          __('pruvious-dashboard', 'Stored encrypted at rest. Synced to the worker as a secret on each deploy.'),
      },
    }),
    isSecret: trueFalseField({
      default: false,
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Is secret'),
        description: ({ __ }) =>
          __(
            'pruvious-dashboard',
            'When the provider supports it, secrets sync as encrypted, non-retrievable bindings (Cloudflare `wrangler secret put`, Vercel/Netlify sensitive env vars). Non-secrets sync as plain variables visible in the provider dashboard (Cloudflare `[vars]` block). On VPS this only affects log masking.',
          ),
      },
    }),
  },
  indexes: [{ fields: ['key'] }],
  hooks: {
    beforeQueryExecution: [denyDuplicateEnvVarKey()],
  },
  translatable: false,
  ui: {
    label: ({ __ }) => __('pruvious-dashboard', 'Environment variables'),
    icon: 'variable',
    menu: {
      group: 'management',
      order: 60,
    },
    indexPage: {
      dataTable: {
        columns: ['targets | 200px', 'key | 240px', 'isSecret | 120px'],
        orderBy: 'key:asc',
      },
    },
  },
})
