import {
  defineCollection,
  nullableTextField,
  recordField,
  resolvePruviousComponent,
  selectField,
  textAreaField,
  timestampField,
} from '#pruvious/server'
import { cleanupFilesOnDelete } from '../utils/cleanupFilesOnDelete'
import { relativeDeployLogPath } from '../utils/deployLog'
import { scopeByAccessibleTargets } from '../utils/deployScopeHook'

const cleanup = cleanupFilesOnDelete('Deployments', (id) => [relativeDeployLogPath(id)])

export default defineCollection({
  fields: {
    target: recordField({
      collection: 'DeploymentTargets',
      required: true,
      foreignKey: 'cascade',
      fields: ['id', 'name', 'type'],
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Deployment target'),
        placeholder: ({ __ }) => __('pruvious-dashboard', 'Select a target'),
        displayFields: ['name', 'type'],
        searchFields: ['name'],
      },
    }),
    commit: nullableTextField({
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Commit'),
        placeholder: 'sha',
      },
    }),
    branch: nullableTextField({
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Branch'),
      },
    }),
    triggeredBy: recordField({
      collection: 'Users',
      fields: ['id', 'email'],
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Triggered by'),
        displayFields: 'email',
        searchFields: 'email',
      },
    }),
    status: selectField({
      required: true,
      default: 'queued',
      choices: [
        { value: 'queued', label: ({ __ }) => __('pruvious-dashboard', 'Queued') },
        { value: 'running', label: ({ __ }) => __('pruvious-dashboard', 'Running') },
        { value: 'success', label: ({ __ }) => __('pruvious-dashboard', 'Success') },
        { value: 'failed', label: ({ __ }) => __('pruvious-dashboard', 'Failed') },
      ],
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Status'),
      },
    }),
    startedAt: timestampField({
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Started at'),
      },
    }),
    finishedAt: timestampField({
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Finished at'),
      },
    }),
    logPath: nullableTextField({
      ui: {
        hidden: true,
        label: ({ __ }) => __('pruvious-dashboard', 'Log path'),
      },
    }),
    error: textAreaField({
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Error'),
      },
    }),
  },
  indexes: [{ fields: ['target', 'createdAt' as any] }, { fields: ['status'] }],
  translatable: false,
  api: { create: false, update: false, delete: true },
  hooks: {
    beforeQueryPreparation: [scopeByAccessibleTargets('collection:deployments:manage')],
    beforeQueryExecution: [cleanup.before],
    afterQueryExecution: [cleanup.after],
  },
  ui: {
    label: ({ __ }) => __('pruvious-dashboard', 'Deployments'),
    icon: 'history',
    menu: {
      group: 'general',
      order: 4,
    },
    indexPage: {
      dataTable: {
        columns: ['target | 180px', 'status | 120px', 'branch | 140px', 'commit | 140px', 'startedAt | 160px'],
        orderBy: 'startedAt:desc',
      },
    },
    updatePage: {
      dashboardLayout: resolvePruviousComponent('>/components/Pruvious/Dashboard/DeploymentView.vue'),
    },
  },
})
