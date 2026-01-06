<template>
  <PruviousDashboardPage noMainPadding noMainScroll>
    <PruviousDashboardLogs
      v-model:details="details"
      v-model:detailsId="detailsId"
      :canDeleteLogs="canDeleteLogs"
      :logCollectionDefinition="logCollectionDefinition"
      :tabbed="tabList.length > 1"
      logCollectionName="Errors"
    >
      <template v-if="details" #detailsHeader>
        <PUIBadge
          :color="
            details.error.method === 'GET'
              ? 'hsl(var(--p-green))'
              : details.error.method === 'POST'
                ? 'hsl(var(--p-purple))'
                : details.error.method === 'PUT'
                  ? 'hsl(var(--p-yellow))'
                  : details.error.method === 'PATCH'
                    ? 'hsl(var(--p-orange))'
                    : details.error.method === 'DELETE'
                      ? 'destructive'
                      : 'secondary'
          "
        >
          {{ details.error.method }}
        </PUIBadge>
        <span
          :title="details.error.path + (details.error.queryString ? '?' + details.error.queryString : '')"
          class="p-details-title"
        >
          <strong>{{ details.error.path }}</strong>
          <span class="pui-muted">{{ details.error.queryString ? '?' + details.error.queryString : '' }}</span>
        </span>
      </template>

      <template v-if="details" #details="{ scrollToTop }">
        <PUITabs :list="tabList" @change="scrollToTop()" active="error">
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
              <div>
                {{ details.request.user }}
                <span class="pui-muted">({{ __('pruvious-dashboard', 'user ID') }})</span>
              </div>
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

          <PUITab name="error">
            <div class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Category') }}</span>
              </PUIFieldLabel>
              <PUIBadge color="accent">
                {{ details.error.category }}
              </PUIBadge>
            </div>
            <div class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Severity') }}</span>
              </PUIFieldLabel>
              <PUIBadge color="secondary">
                {{ details.error.severity }}
              </PUIBadge>
            </div>
            <div class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Message') }}</span>
              </PUIFieldLabel>
              <PUICode
                :code="details.error.message"
                :copiedTooltip="__('pruvious-dashboard', 'Copied')"
                :copyTooltip="__('pruvious-dashboard', 'Copy to clipboard')"
                language="markdown"
              />
            </div>
            <div v-if="!isEmpty(details.error.payload)" class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Payload') }}</span>
              </PUIFieldLabel>
              <PUICode
                :code="JSON.stringify(details.error.payload, null, 2)"
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
                {{ dayjsFormatDateTime(details.error.createdAt) }}
                <span class="pui-muted">({{ dayjsRelative(details.error.createdAt) }})</span>
              </div>
            </div>
            <div v-if="details.error.user" class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'User') }}</span>
              </PUIFieldLabel>
              <div>{{ details.error.user }}</div>
            </div>
            <div v-if="details.error.requestDebugId" class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Request debug ID') }}</span>
              </PUIFieldLabel>
              <PUICode
                :code="details.error.requestDebugId"
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
import { __, hasPermission } from '#pruvious/app'
import { dashboardBasePath, dashboardMiddleware, usePruviousDashboard } from '#pruvious/dashboard'
import { dayjsFormatDateTime, dayjsRelative } from '#pruvious/dashboard/dayjs'
import type { GenericSerializableFieldOptions, LogsDatabase, SerializableCollection } from '#pruvious/server'
import { isEmpty } from '@pruvious/utils'
import { beautifyCode, beautifyQueryString } from '../../../utils/pruvious/dashboard/beautify'
import { logsQueryBuilder } from '../../../utils/pruvious/dashboard/logs'

definePageMeta({
  path: dashboardBasePath + 'logs/errors',
  middleware: [
    (to) => dashboardMiddleware(to, 'default'),
    (to) => dashboardMiddleware(to, 'auth-guard'),
    (to) =>
      dashboardMiddleware(to, ({ __, puiQueueToast, usePruviousDashboard }) => {
        if (!usePruviousDashboard().value?.logs?.errors) {
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
  title: __('pruvious-dashboard', 'Errors') + ' - ' + __('pruvious-dashboard', 'Logs'),
})

const route = useRoute()
const dashboard = usePruviousDashboard()
const canDeleteLogs = computed(() => hasPermission('delete-logs'))
const detailsId = ref<number | null>(null)
const details = ref<{
  request?: ({ id: number } & LogsDatabase['collections']['Requests']['TCastedTypes']) | null
  response?: ({ id: number } & LogsDatabase['collections']['Responses']['TCastedTypes']) | null
  error: { id: number } & LogsDatabase['collections']['Errors']['TCastedTypes']
} | null>(null)
const tabList = computed(() => [
  ...(details.value?.request ? [{ name: 'request', label: __('pruvious-dashboard', 'Request') }] : []),
  ...(details.value?.response ? [{ name: 'response', label: __('pruvious-dashboard', 'Response') }] : []),
  { name: 'error', label: __('pruvious-dashboard', 'Error') },
])

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
    requestDebugId: {
      nullable: false,
      default: '',
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
    category: {
      nullable: false,
      default: '',
      ui: { label: __('pruvious-dashboard', 'Category') },
      _fieldType: 'text',
      _dataType: 'text',
      _hasPopulator: false,
    },
    severity: {
      nullable: false,
      default: 0,
      decimalPlaces: 0,
      max: Number.MAX_SAFE_INTEGER,
      min: 0,
      ui: { label: __('pruvious-dashboard', 'Severity') },
      _fieldType: 'number',
      _dataType: 'numeric',
      _hasPopulator: false,
    },
    message: {
      nullable: false,
      default: '',
      ui: { label: __('pruvious-dashboard', 'Message') },
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
    user: {
      nullable: true,
      default: null,
      collection: 'Users',
      fields: ['id', 'email', 'firstName', 'lastName'],
      ui: {
        label: __('pruvious-dashboard', 'User'),
        displayFields: [['firstName', ' ', 'lastName'], 'email'],
        searchFields: ['firstName', 'lastName', 'email'],
      },
      _fieldType: 'record',
      _dataType: 'text',
      _hasPopulator: false,
    },
    createdAt: {
      nullable: false,
      default: '',
      ui: { label: __('pruvious-dashboard', 'Date') },
      _fieldType: 'dateTime',
      _dataType: 'numeric',
      _hasPopulator: false,
    },
  } as Record<string, Partial<GenericSerializableFieldOptions>>,
  ui: {
    indexPage: {
      table: {
        columns: ['category | 150px', 'message', 'severity | 150px', 'user | 150px', 'createdAt | 220px'],
        orderBy: 'createdAt:desc',
      },
    },
  },
} as SerializableCollection

watch(detailsId, async () => {
  let query = { ...route.query }
  delete query.details

  if (detailsId.value) {
    const error = await logsQueryBuilder.selectFrom('Errors').where('id', '=', detailsId.value).first()

    if (error.success && error.data) {
      const related = await Promise.all([
        dashboard.value?.logs?.api && error.data.requestDebugId
          ? logsQueryBuilder.selectFrom('Requests').where('requestDebugId', '=', error.data.requestDebugId).first()
          : null,
        dashboard.value?.logs?.api && error.data.requestDebugId
          ? logsQueryBuilder.selectFrom('Responses').where('requestDebugId', '=', error.data.requestDebugId).first()
          : null,
      ])
      details.value = {
        request: related[0]?.data,
        response: related[1]?.data,
        error: error.data,
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
