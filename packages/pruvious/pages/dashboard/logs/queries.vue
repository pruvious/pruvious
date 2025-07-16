<template>
  <PruviousDashboardPage noMainPadding noMainScroll>
    <PruviousDashboardLogs
      v-model:details="details"
      v-model:detailsId="detailsId"
      :canDeleteLogs="canDeleteLogs"
      :logCollectionDefinition="logCollectionDefinition"
      logCollectionName="Queries"
    >
      <template v-if="details" #detailsHeader>
        <PUIBadge
          :color="
            details.query.method === 'GET'
              ? 'hsl(var(--p-green))'
              : details.query.method === 'POST'
                ? 'hsl(var(--p-purple))'
                : details.query.method === 'PUT'
                  ? 'hsl(var(--p-yellow))'
                  : details.query.method === 'PATCH'
                    ? 'hsl(var(--p-orange))'
                    : details.query.method === 'DELETE'
                      ? 'destructive'
                      : 'secondary'
          "
        >
          {{ details.query.method }}
        </PUIBadge>
        <span
          :title="details.query.path + (details.query.queryString ? '?' + details.query.queryString : '')"
          class="p-details-title"
        >
          <strong>{{ details.query.path }}</strong>
          <span class="pui-muted">{{ details.query.queryString ? '?' + details.query.queryString : '' }}</span>
        </span>
      </template>

      <template v-if="details" #details="{ scrollToTop }">
        <PUITabs
          :list="[
            ...(details.request ? [{ name: 'request', label: __('pruvious-dashboard', 'Request') }] : []),
            ...(details.response ? [{ name: 'response', label: __('pruvious-dashboard', 'Response') }] : []),
            { name: 'query', label: __('pruvious-dashboard', 'Query') },
          ]"
          @change="scrollToTop()"
          active="query"
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
                <span class="pui-label">{{ __('pruvious-dashboard', 'Date') }}</span>
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
                <span class="pui-label">{{ __('pruvious-dashboard', 'Date') }}</span>
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

          <PUITab name="query">
            <div class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Operation') }}</span>
              </PUIFieldLabel>
              <PUIBadge
                :color="
                  details.query.operation === 'insert'
                    ? 'hsl(var(--p-purple))'
                    : details.query.operation === 'select'
                      ? 'hsl(var(--p-green))'
                      : details.query.operation === 'update'
                        ? 'hsl(var(--p-orange))'
                        : 'destructive'
                "
                class="pui-uppercase"
              >
                {{ details.query.operation }}
              </PUIBadge>
            </div>
            <div class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Execution time') }}</span>
              </PUIFieldLabel>
              <PUIBadge color="accent">{{ details.query.executionTime }} ms</PUIBadge>
            </div>
            <div class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Status') }}</span>
              </PUIFieldLabel>
              <PUIBadge :color="details.query.success ? 'hsl(var(--p-green))' : 'destructive'">
                {{ details.query.success ? __('pruvious-dashboard', 'Success') : __('pruvious-dashboard', 'Error') }}
              </PUIBadge>
            </div>
            <div class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'SQL') }}</span>
              </PUIFieldLabel>
              <PUICode
                :code="details.query.sql"
                :copiedTooltip="__('pruvious-dashboard', 'Copied')"
                :copyTooltip="__('pruvious-dashboard', 'Copy to clipboard')"
                language="sql"
              />
            </div>
            <div v-if="!isEmpty(details.query.params)" class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Parameters') }}</span>
              </PUIFieldLabel>
              <PUICode
                :code="JSON.stringify(details.query.params, null, 2)"
                :copiedTooltip="__('pruvious-dashboard', 'Copied')"
                :copyTooltip="__('pruvious-dashboard', 'Copy to clipboard')"
                language="json"
              />
            </div>
            <div class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">
                  {{
                    details.query.success
                      ? __('pruvious-dashboard', 'Output (database)')
                      : __('pruvious-dashboard', 'Error')
                  }}
                </span>
              </PUIFieldLabel>
              <PUICode
                :code="details.query.rawResult ? beautifyCode(details.query.rawResult) : 'null'"
                :copiedTooltip="__('pruvious-dashboard', 'Copied')"
                :copyTooltip="__('pruvious-dashboard', 'Copy to clipboard')"
                language="json"
              />
            </div>
            <div class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">
                  {{
                    details.query.success ? __('pruvious-dashboard', 'Output (ORM)') : __('pruvious-dashboard', 'Error')
                  }}
                </span>
              </PUIFieldLabel>
              <PUICode
                :code="JSON.stringify(details.query.result, null, 2)"
                :copiedTooltip="__('pruvious-dashboard', 'Copied')"
                :copyTooltip="__('pruvious-dashboard', 'Copy to clipboard')"
                language="json"
              />
            </div>
            <div class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Date') }}</span>
              </PUIFieldLabel>
              <div>
                {{ dayjsFormatDateTime(details.query.createdAt) }}
                <span class="pui-muted">({{ dayjsRelative(details.query.createdAt) }})</span>
              </div>
            </div>
            <div v-if="details.query.user" class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'User') }}</span>
              </PUIFieldLabel>
              <!-- @todo record preview -->
              <div>{{ details.query.user }}</div>
            </div>
            <div class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Query debug ID') }}</span>
              </PUIFieldLabel>
              <PUICode
                :code="details.query.queryDebugId"
                :copiedTooltip="__('pruvious-dashboard', 'Copied')"
                :copyTooltip="__('pruvious-dashboard', 'Copy to clipboard')"
                language="markdown"
              />
            </div>
            <div v-if="details.query.requestDebugId" class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Request debug ID') }}</span>
              </PUIFieldLabel>
              <PUICode
                :code="details.query.requestDebugId"
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
import { isEmpty } from '@pruvious/utils'
import { beautifyCode, beautifyQueryString } from '../../../utils/pruvious/dashboard/beautify'
import { logsQueryBuilder } from '../../../utils/pruvious/dashboard/logs'

definePageMeta({
  path: dashboardBasePath + 'logs/queries',
  middleware: [
    (to) => dashboardMiddleware(to, 'default'),
    (to) => dashboardMiddleware(to, 'auth-guard'),
    (to) =>
      dashboardMiddleware(to, ({ __, puiQueueToast, usePruviousDashboard }) => {
        if (!usePruviousDashboard().value?.logs?.queries) {
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
  title: __('pruvious-dashboard', 'Queries') + ' - ' + __('pruvious-dashboard', 'Logs'),
})

const route = useRoute()
const dashboard = usePruviousDashboard()
const canDeleteLogs = computed(() => hasPermission('delete-logs'))
const detailsId = ref<number | null>(null)
const details = ref<{
  request?: ({ id: number } & LogsDatabase['collections']['Requests']['TCastedTypes']) | null
  response?: ({ id: number } & LogsDatabase['collections']['Responses']['TCastedTypes']) | null
  query: { id: number } & LogsDatabase['collections']['Queries']['TCastedTypes']
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
    queryDebugId: {
      nullable: false,
      default: '',
      ui: { label: __('pruvious-dashboard', 'Query debug ID') },
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
    sql: {
      nullable: false,
      default: '',
      ui: { label: __('pruvious-dashboard', 'SQL') },
      _fieldType: 'text',
      _dataType: 'text',
      _hasPopulator: false,
    },
    params: {
      nullable: false,
      default: '',
      ui: { label: __('pruvious-dashboard', 'Parameters') },
      _fieldType: 'text',
      _dataType: 'text',
      _hasPopulator: false,
    },
    executionTime: {
      nullable: false,
      default: 0,
      decimalPlaces: 2,
      max: Number.MAX_SAFE_INTEGER,
      min: 0,
      ui: { label: __('pruvious-dashboard', 'Execution time') },
      _fieldType: 'number',
      _dataType: 'numeric',
      _hasPopulator: false,
    },
    rawResult: {
      nullable: true,
      default: '',
      ui: { label: __('pruvious-dashboard', 'Raw result') },
      _fieldType: 'text',
      _dataType: 'text',
      _hasPopulator: false,
    },
    result: {
      nullable: false,
      default: '',
      ui: { label: __('pruvious-dashboard', 'Result') },
      _fieldType: 'text',
      _dataType: 'text',
      _hasPopulator: false,
    },
    operation: {
      nullable: false,
      default: '',
      choices: [
        { value: 'insert', label: __('pruvious-dashboard', 'Insert') },
        { value: 'select', label: __('pruvious-dashboard', 'Select') },
        { value: 'update', label: __('pruvious-dashboard', 'Update') },
        { value: 'delete', label: __('pruvious-dashboard', 'Delete') },
      ],
      ui: { label: __('pruvious-dashboard', 'Operation') },
      _fieldType: 'select',
      _dataType: 'text',
      _hasPopulator: false,
    },
    success: {
      nullable: false,
      default: true,
      noLabel: __('pruvious-dashboard', 'Error'),
      yesLabel: __('pruvious-dashboard', 'Success'),
      ui: { label: __('pruvious-dashboard', 'Status') },
      _fieldType: 'trueFalse',
      _dataType: 'boolean',
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
      ui: { label: __('pruvious-dashboard', 'Date') },
      _fieldType: 'timestamp',
      _dataType: 'numeric',
      _hasPopulator: false,
    },
  } as Record<string, Partial<GenericSerializableFieldOptions>>,
  ui: {
    indexPage: {
      table: {
        columns: ['operation | 150px', 'sql', 'executionTime | 150px', 'success | 150px', 'createdAt | 220px'],
        orderBy: 'createdAt:desc',
      },
    },
  },
} as SerializableCollection

watch(detailsId, async () => {
  let query = { ...route.query }
  delete query.details

  if (detailsId.value) {
    const queryLogItem = await logsQueryBuilder.selectFrom('Queries').where('id', '=', detailsId.value).first()

    if (queryLogItem.success && queryLogItem.data) {
      const related = await Promise.all([
        dashboard.value?.logs?.api && queryLogItem.data.requestDebugId
          ? logsQueryBuilder
              .selectFrom('Requests')
              .where('requestDebugId', '=', queryLogItem.data.requestDebugId)
              .first()
          : null,
        dashboard.value?.logs?.api && queryLogItem.data.requestDebugId
          ? logsQueryBuilder
              .selectFrom('Responses')
              .where('requestDebugId', '=', queryLogItem.data.requestDebugId)
              .first()
          : null,
      ])
      details.value = {
        request: related[0]?.data,
        response: related[1]?.data,
        query: queryLogItem.data,
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
