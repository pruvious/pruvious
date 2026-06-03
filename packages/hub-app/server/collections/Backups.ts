import {
  defineCollection,
  nullableTextField,
  numberField,
  recordField,
  resolvePruviousComponent,
  selectField,
  textAreaField,
  timestampField,
} from '#pruvious/server'
import { relativeArtifactDir } from '../utils/backupArtifact'
import { relativeBackupLogPath } from '../utils/backupLog'
import { cleanupFilesOnDelete } from '../utils/cleanupFilesOnDelete'
import { scopeByAccessibleTargets } from '../utils/deployScopeHook'

const cleanup = cleanupFilesOnDelete('Backups', (id) => [relativeArtifactDir(id), relativeBackupLogPath(id)])

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
    type: selectField({
      required: true,
      default: 'full',
      choices: [
        { value: 'db', label: ({ __ }) => __('pruvious-dashboard', 'Database') },
        { value: 'uploads', label: ({ __ }) => __('pruvious-dashboard', 'Uploads') },
        { value: 'full', label: ({ __ }) => __('pruvious-dashboard', 'Full') },
      ],
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Type'),
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
    storagePath: nullableTextField({
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Storage path'),
      },
    }),
    sizeBytes: numberField({
      default: 0,
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Size'),
        suffix: 'bytes',
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
    expiresAt: timestampField({
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Expires at'),
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
    beforeQueryPreparation: [scopeByAccessibleTargets('collection:backups:manage')],
    beforeQueryExecution: [cleanup.before],
    afterQueryExecution: [cleanup.after],
  },
  ui: {
    label: ({ __ }) => __('pruvious-dashboard', 'Backups'),
    icon: 'database-export',
    menu: {
      group: 'management',
      order: 70,
    },
    indexPage: {
      dataTable: {
        columns: ['target | 180px', 'type | 120px', 'status | 120px', 'sizeBytes | 120px', 'createdAt | 160px'],
        orderBy: 'createdAt:desc',
      },
    },
    updatePage: {
      dashboardLayout: resolvePruviousComponent('>/components/Pruvious/Dashboard/BackupView.vue'),
    },
  },
})
