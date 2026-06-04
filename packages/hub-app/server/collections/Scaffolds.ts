import {
  defineCollection,
  nullableTextField,
  recordField,
  resolvePruviousComponent,
  selectField,
  textAreaField,
  textField,
  timestampField,
  trueFalseField,
} from '#pruvious/server'
import { cleanupFilesOnDelete } from '../utils/cleanupFilesOnDelete'
import { relativeScaffoldLogPath } from '../utils/scaffoldLog'

const cleanup = cleanupFilesOnDelete('Scaffolds', (id) => [relativeScaffoldLogPath(id)])

export default defineCollection({
  fields: {
    name: textField({
      required: true,
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Project name'),
      },
    }),
    targetDir: textField({
      required: true,
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Target directory'),
      },
    }),
    parentDir: textField({
      required: true,
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Parent directory'),
      },
    }),
    languageCode: textField({
      required: true,
      default: 'en',
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Language code'),
      },
    }),
    languageName: nullableTextField({
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Language name'),
      },
    }),
    packageManager: selectField({
      required: true,
      default: 'npm',
      choices: [
        { value: 'npm', label: 'npm' },
        { value: 'pnpm', label: 'pnpm' },
      ],
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Package manager'),
      },
    }),
    pruviousSpec: textField({
      required: true,
      default: 'alpha',
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Pruvious version or dist-tag'),
      },
    }),
    install: trueFalseField({
      default: true,
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Install dependencies after scaffolding'),
      },
    }),
    force: trueFalseField({
      default: false,
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Overwrite if target exists'),
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
    project: recordField({
      collection: 'Projects',
      fields: ['id', 'name'],
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Project'),
        displayFields: 'name',
        searchFields: 'name',
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
  },
  indexes: [{ fields: ['status'] }],
  translatable: false,
  api: { create: false, update: false, delete: true },
  hooks: {
    beforeQueryExecution: [cleanup.before],
    afterQueryExecution: [cleanup.after],
  },
  ui: {
    label: ({ __ }) => __('pruvious-dashboard', 'Scaffolds'),
    icon: 'wand',
    menu: { hidden: true },
    indexPage: {
      dataTable: {
        columns: ['name | 200px', 'status | 120px', 'targetDir', 'startedAt | 160px'],
        orderBy: 'startedAt:desc',
      },
    },
    updatePage: {
      dashboardLayout: resolvePruviousComponent('>/components/Pruvious/Dashboard/ScaffoldView.vue'),
    },
  },
})
