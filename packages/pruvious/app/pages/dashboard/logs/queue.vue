<template>
  <PruviousDashboardPage noMainPadding noMainScroll>
    <PruviousDashboardLogs
      v-model:details="details"
      v-model:detailsId="detailsId"
      :canDeleteLogs="canDeleteLogs"
      :logCollectionDefinition="logCollectionDefinition"
      logCollectionName="Queue"
    >
      <template v-if="details" #detailsHeader>
        <PUIBadge
          :color="
            details.job.method === 'GET'
              ? 'hsl(var(--p-green))'
              : details.job.method === 'POST'
                ? 'hsl(var(--p-purple))'
                : details.job.method === 'PUT'
                  ? 'hsl(var(--p-yellow))'
                  : details.job.method === 'PATCH'
                    ? 'hsl(var(--p-orange))'
                    : details.job.method === 'DELETE'
                      ? 'destructive'
                      : 'secondary'
          "
        >
          {{ details.job.method }}
        </PUIBadge>
        <span
          :title="details.job.path + (details.job.queryString ? '?' + details.job.queryString : '')"
          class="p-details-title"
        >
          <strong>{{ details.job.path }}</strong>
          <span class="pui-muted">{{ details.job.queryString ? '?' + details.job.queryString : '' }}</span>
        </span>
      </template>

      <template v-if="details" #details="{ scrollToTop }">
        <PUITabs
          :list="[
            ...(details.request ? [{ name: 'request', label: __('pruvious-dashboard', 'Request') }] : []),
            ...(details.response ? [{ name: 'response', label: __('pruvious-dashboard', 'Response') }] : []),
            { name: 'job', label: __('pruvious-dashboard', 'Job') },
          ]"
          @change="scrollToTop()"
          active="job"
        >
          <PUITab v-if="details.request" name="request">
            <div class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Headers') }}</span>
              </PUIFieldLabel>
              <PUICode
                :code="JSON.stringify(details.request.headers, null, 2)"
                :copiedTooltip="__('pruvious-dashboard', 'Copied')"
                :copyTooltip="__('pruvious-dashboard', 'Copy to clipboard')"
                language="json"
              />
            </div>
            <div v-if="details.request.queryString" class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Query string') }}</span>
              </PUIFieldLabel>
              <PUICode
                :code="beautifyQueryString(details.request.queryString)"
                :copiedTooltip="__('pruvious-dashboard', 'Copied')"
                :copyTooltip="__('pruvious-dashboard', 'Copy to clipboard')"
                language="json"
              />
            </div>
            <div v-if="details.request.body" class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Body') }}</span>
              </PUIFieldLabel>
              <PUICode
                :code="beautifyCode(details.request.body)"
                :copiedTooltip="__('pruvious-dashboard', 'Copied')"
                :copyTooltip="__('pruvious-dashboard', 'Copy to clipboard')"
                language="json"
              />
            </div>
            <div class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Created at') }}</span>
              </PUIFieldLabel>
              <div>
                {{ dayjsFormatDateTime(details.request.createdAt) }}
                <span class="pui-muted">({{ dayjsRelative(details.request.createdAt) }})</span>
              </div>
            </div>
            <div v-if="details.request.user" class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'User') }}</span>
              </PUIFieldLabel>
              <!-- @todo record preview -->
              <div>{{ details.request.user }}</div>
            </div>
            <div class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Request debug ID') }}</span>
              </PUIFieldLabel>
              <PUICode
                :code="details.request.requestDebugId"
                :copiedTooltip="__('pruvious-dashboard', 'Copied')"
                :copyTooltip="__('pruvious-dashboard', 'Copy to clipboard')"
                language="markdown"
              />
            </div>
          </PUITab>

          <PUITab v-if="details.response" name="response">
            <div class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Status') }}</span>
              </PUIFieldLabel>
              <div class="pui-row">
                <PUIBadge
                  :color="
                    details.response.statusCode >= 200 && details.response.statusCode < 300
                      ? 'hsl(var(--p-green))'
                      : details.response.statusCode >= 400 && details.response.statusCode < 500
                        ? 'hsl(var(--p-orange))'
                        : details.response.statusCode >= 500
                          ? 'destructive'
                          : 'accent'
                  "
                >
                  {{ details.response.statusCode }}
                </PUIBadge>
                <span>{{ details.response.statusMessage }}</span>
              </div>
            </div>
            <div class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Headers') }}</span>
              </PUIFieldLabel>
              <PUICode
                :code="JSON.stringify(details.response.headers, null, 2)"
                :copiedTooltip="__('pruvious-dashboard', 'Copied')"
                :copyTooltip="__('pruvious-dashboard', 'Copy to clipboard')"
                language="json"
              />
            </div>
            <div v-if="details.response.body" class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Body') }}</span>
              </PUIFieldLabel>
              <PUICode
                :code="beautifyCode(details.response.body)"
                :copiedTooltip="__('pruvious-dashboard', 'Copied')"
                :copyTooltip="__('pruvious-dashboard', 'Copy to clipboard')"
                language="json"
              />
            </div>
            <div v-if="details.response.errorMessage" class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Error') }}</span>
              </PUIFieldLabel>
              <PUICode
                :code="details.response.errorMessage"
                :copiedTooltip="__('pruvious-dashboard', 'Copied')"
                :copyTooltip="__('pruvious-dashboard', 'Copy to clipboard')"
                language="markdown"
              />
            </div>
            <div class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Created at') }}</span>
              </PUIFieldLabel>
              <div>
                {{ dayjsFormatDateTime(details.response.createdAt) }}
                <span class="pui-muted">({{ dayjsRelative(details.response.createdAt) }})</span>
              </div>
            </div>
            <div v-if="details.response.user" class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'User') }}</span>
              </PUIFieldLabel>
              <!-- @todo record preview -->
              <div>{{ details.response.user }}</div>
            </div>
            <div class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Request debug ID') }}</span>
              </PUIFieldLabel>
              <PUICode
                :code="details.response.requestDebugId"
                :copiedTooltip="__('pruvious-dashboard', 'Copied')"
                :copyTooltip="__('pruvious-dashboard', 'Copy to clipboard')"
                language="markdown"
              />
            </div>
          </PUITab>

          <PUITab name="job">
            <div class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Priority') }}</span>
              </PUIFieldLabel>
              <PUIBadge color="accent">
                {{ details.job.priority }}
              </PUIBadge>
            </div>
            <div class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Attempts') }}</span>
              </PUIFieldLabel>
              <PUIBadge color="secondary">
                {{ details.job.attempt }}
              </PUIBadge>
            </div>
            <div class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Status') }}</span>
              </PUIFieldLabel>
              <PUIBadge
                :color="
                  details.job.status === 'success'
                    ? 'hsl(var(--p-green))'
                    : details.job.status === 'error'
                      ? 'destructive'
                      : 'accent'
                "
                class="pui-capitalize"
              >
                {{
                  details.job.status === 'success'
                    ? __('pruvious-dashboard', 'Success')
                    : details.job.status === 'error'
                      ? __('pruvious-dashboard', 'Error')
                      : __('pruvious-dashboard', 'Pending')
                }}
              </PUIBadge>
            </div>
            <div class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Job name') }}</span>
              </PUIFieldLabel>
              <PUICode
                :code="details.job.name"
                :copiedTooltip="__('pruvious-dashboard', 'Copied')"
                :copyTooltip="__('pruvious-dashboard', 'Copy to clipboard')"
                language="markdown"
              />
            </div>
            <div v-if="details.job.payload" class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Payload') }}</span>
              </PUIFieldLabel>
              <PUICode
                :code="JSON.stringify(details.job.payload, null, 2)"
                :copiedTooltip="__('pruvious-dashboard', 'Copied')"
                :copyTooltip="__('pruvious-dashboard', 'Copy to clipboard')"
                language="json"
              />
            </div>
            <div v-if="!isNull(details.job.result)" class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">
                  {{
                    details.job.status === 'success'
                      ? __('pruvious-dashboard', 'Result')
                      : __('pruvious-dashboard', 'Error')
                  }}
                </span>
              </PUIFieldLabel>
              <PUICode
                :code="details.job.status === 'success' ? beautifyCode(details.job.result) : details.job.result"
                :copiedTooltip="__('pruvious-dashboard', 'Copied')"
                :copyTooltip="__('pruvious-dashboard', 'Copy to clipboard')"
                language="json"
              />
            </div>
            <div v-if="details.job.scheduledAt" class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Scheduled at') }}</span>
              </PUIFieldLabel>
              <div>
                {{ dayjsFormatDateTime(details.job.scheduledAt) }}
                <span class="pui-muted">({{ dayjsRelative(details.job.scheduledAt) }})</span>
              </div>
            </div>
            <div class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Created at') }}</span>
              </PUIFieldLabel>
              <div>
                {{ dayjsFormatDateTime(details.job.createdAt) }}
                <span class="pui-muted">({{ dayjsRelative(details.job.createdAt) }})</span>
              </div>
            </div>
            <div v-if="details.job.completedAt" class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Completed at') }}</span>
              </PUIFieldLabel>
              <div>
                {{ dayjsFormatDateTime(details.job.completedAt) }}
                <span class="pui-muted">({{ dayjsRelative(details.job.completedAt) }})</span>
              </div>
            </div>
            <div v-if="details.job.user" class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'User') }}</span>
              </PUIFieldLabel>
              <!-- @todo record preview -->
              <div>{{ details.job.user }}</div>
            </div>
            <div class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Job debug ID') }}</span>
              </PUIFieldLabel>
              <PUICode
                :code="details.job.jobDebugId"
                :copiedTooltip="__('pruvious-dashboard', 'Copied')"
                :copyTooltip="__('pruvious-dashboard', 'Copy to clipboard')"
                language="markdown"
              />
            </div>
            <div v-if="details.job.requestDebugId" class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Request debug ID') }}</span>
              </PUIFieldLabel>
              <PUICode
                :code="details.job.requestDebugId"
                :copiedTooltip="__('pruvious-dashboard', 'Copied')"
                :copyTooltip="__('pruvious-dashboard', 'Copy to clipboard')"
                language="markdown"
              />
            </div>
          </PUITab>
        </PUITabs>
      </template>
    </PruviousDashboardLogs>
  </PruviousDashboardPage>
</template>

<script lang="ts" setup>
import { __, dashboardBasePath, dashboardMiddleware, hasPermission, usePruviousDashboard } from '#pruvious/client'
import { dayjsFormatDateTime, dayjsRelative } from '#pruvious/client/dayjs'
import type { GenericSerializableFieldOptions, LogsDatabase, SerializableCollection } from '#pruvious/server'
import { isNull } from '@pruvious/utils'
import { beautifyCode, beautifyQueryString } from '../../../utils/pruvious/dashboard/beautify'
import { logsQueryBuilder } from '../../../utils/pruvious/dashboard/logs'

definePageMeta({
  path: dashboardBasePath + 'logs/queue',
  middleware: [
    (to) => dashboardMiddleware(to, 'default'),
    (to) => dashboardMiddleware(to, 'auth-guard'),
    (to) =>
      dashboardMiddleware(to, ({ __, puiQueueToast, usePruviousDashboard }) => {
        if (!usePruviousDashboard().value?.logs?.queue) {
          puiQueueToast(__('pruvious-dashboard', 'Redirected'), {
            type: 'error',
            description: __('pruvious-dashboard', 'You do not have permission to access the page `$page`', {
              page: to.path,
            }),
            showAfterRouteChange: true,
          })
          return navigateTo(dashboardBasePath + 'overview')
        }
      }),
  ],
})

useHead({
  title: __('pruvious-dashboard', 'Queue') + ' - ' + __('pruvious-dashboard', 'Logs'),
})

const route = useRoute()
const dashboard = usePruviousDashboard()
const canDeleteLogs = computed(() => hasPermission('delete-logs'))
const detailsId = ref<number | null>(null)
const details = ref<{
  request?: ({ id: number } & LogsDatabase['collections']['Requests']['TCastedTypes']) | null
  response?: ({ id: number } & LogsDatabase['collections']['Responses']['TCastedTypes']) | null
  job: { id: number } & LogsDatabase['collections']['Queue']['TCastedTypes']
} | null>(null)

const logCollectionDefinition = {
  translatable: false,
  syncedFields: [] as any,
  fields: {
    id: {
      nullable: false,
      default: 1,
      decimalPlaces: 0,
      max: Number.MAX_SAFE_INTEGER,
      min: 1,
      ui: { label: __('pruvious-dashboard', 'ID') },
      _fieldType: 'number',
      _dataType: 'bigint',
      _hasPopulator: false,
    },
    jobDebugId: {
      nullable: false,
      default: '',
      ui: { label: __('pruvious-dashboard', 'Job debug ID') },
      _fieldType: 'text',
      _dataType: 'text',
      _hasPopulator: false,
    },
    requestDebugId: {
      nullable: true,
      default: 'null',
      ui: { label: __('pruvious-dashboard', 'Request debug ID') },
      _fieldType: 'text',
      _dataType: 'text',
      _hasPopulator: false,
    },
    method: {
      nullable: false,
      default: '',
      choices: [{ value: 'GET' }, { value: 'POST' }, { value: 'PUT' }, { value: 'PATCH' }, { value: 'DELETE' }],
      ui: { label: __('pruvious-dashboard', 'HTTP Method') },
      _fieldType: 'select',
      _dataType: 'text',
      _hasPopulator: false,
    },
    path: {
      nullable: false,
      default: '',
      ui: { label: __('pruvious-dashboard', 'Path') },
      _fieldType: 'text',
      _dataType: 'text',
      _hasPopulator: false,
    },
    queryString: {
      nullable: false,
      default: '',
      ui: { label: __('pruvious-dashboard', 'Query string') },
      _fieldType: 'text',
      _dataType: 'text',
      _hasPopulator: false,
    },
    name: {
      nullable: false,
      default: '',
      ui: { label: __('pruvious-dashboard', 'Job name') },
      _fieldType: 'text',
      _dataType: 'text',
      _hasPopulator: false,
    },
    payload: {
      nullable: true,
      default: 'null',
      ui: { label: __('pruvious-dashboard', 'Payload') },
      _fieldType: 'text',
      _dataType: 'text',
      _hasPopulator: false,
    },
    priority: {
      nullable: false,
      default: 10,
      decimalPlaces: 0,
      max: Number.MAX_SAFE_INTEGER,
      min: Number.MIN_SAFE_INTEGER,
      ui: { label: __('pruvious-dashboard', 'Priority') },
      _fieldType: 'number',
      _dataType: 'numeric',
      _hasPopulator: false,
    },
    key: {
      nullable: true,
      default: 'null',
      ui: { label: __('pruvious-dashboard', 'Key') },
      _fieldType: 'text',
      _dataType: 'text',
      _hasPopulator: false,
    },
    attempt: {
      nullable: false,
      default: 1,
      decimalPlaces: 0,
      max: Number.MAX_SAFE_INTEGER,
      min: 0,
      ui: { label: __('pruvious-dashboard', 'Attempts') },
      _fieldType: 'number',
      _dataType: 'numeric',
      _hasPopulator: false,
    },
    scheduledAt: {
      nullable: false,
      default: '',
      ui: { label: __('pruvious-dashboard', 'Scheduled at') },
      _fieldType: 'timestamp',
      _dataType: 'numeric',
      _hasPopulator: false,
    },
    completedAt: {
      nullable: true,
      default: null,
      ui: { label: __('pruvious-dashboard', 'Completed at') },
      _fieldType: 'timestamp',
      _dataType: 'numeric',
      _hasPopulator: false,
    },
    status: {
      nullable: false,
      default: '',
      choices: [
        { value: 'pending', label: __('pruvious-dashboard', 'Pending') },
        { value: 'error', label: __('pruvious-dashboard', 'Error') },
        { value: 'success', label: __('pruvious-dashboard', 'Success') },
      ],
      ui: { label: __('pruvious-dashboard', 'Status') },
      _fieldType: 'select',
      _dataType: 'text',
      _hasPopulator: false,
    },
    result: {
      nullable: true,
      default: 'null',
      ui: { label: __('pruvious-dashboard', 'Result') },
      _fieldType: 'text',
      _dataType: 'text',
      _hasPopulator: false,
    },
    user: {
      nullable: true,
      default: null,
      collection: 'Users',
      fields: ['id', 'email', 'firstName', 'lastName'],
      ui: { label: __('pruvious-dashboard', 'User') },
      _fieldType: 'record',
      _dataType: 'text',
      _hasPopulator: false,
    },
    createdAt: {
      nullable: false,
      default: '',
      ui: { label: __('pruvious-dashboard', 'Created at') },
      _fieldType: 'timestamp',
      _dataType: 'numeric',
      _hasPopulator: false,
    },
  } as Record<string, Partial<GenericSerializableFieldOptions>>,
  ui: {
    indexPage: {
      table: {
        columns: ['priority | 150px', 'name', 'attempt | 150px', 'status | 150px', 'createdAt | 220px'],
        orderBy: 'createdAt:desc',
      },
    },
  },
} as SerializableCollection

watch(detailsId, async () => {
  let query = { ...route.query }
  delete query.details

  if (detailsId.value) {
    const job = await logsQueryBuilder.selectFrom('Queue').where('id', '=', detailsId.value).first()

    if (job.success && job.data) {
      const related = await Promise.all([
        dashboard.value?.logs?.api && job.data.requestDebugId
          ? logsQueryBuilder.selectFrom('Requests').where('requestDebugId', '=', job.data.requestDebugId).first()
          : null,
        dashboard.value?.logs?.api && job.data.requestDebugId
          ? logsQueryBuilder.selectFrom('Responses').where('requestDebugId', '=', job.data.requestDebugId).first()
          : null,
      ])
      details.value = {
        request: related[0]?.data,
        response: related[1]?.data,
        job: job.data,
      }
      query = { details: String(detailsId.value), ...query }
    } else {
      details.value = null
    }
  } else {
    details.value = null
  }

  await navigateTo({ query })
})
</script>

<style scoped>
:deep(.p-page-main) {
  height: 100%;
}
</style>
