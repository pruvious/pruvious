<template>
  <PruviousDashboardPage noMainPadding noMainScroll>
    <PruviousDashboardLogs
      v-model:details="details"
      v-model:detailsId="detailsId"
      :canDeleteLogs="canDeleteLogs"
      :logCollectionDefinition="logCollectionDefinition"
      logCollectionName="Custom"
    >
      <template v-if="details" #detailsHeader>
        <PUIBadge
          :color="
            details.custom.method === 'GET'
              ? 'hsl(var(--p-green))'
              : details.custom.method === 'POST'
                ? 'hsl(var(--p-purple))'
                : details.custom.method === 'PUT'
                  ? 'hsl(var(--p-yellow))'
                  : details.custom.method === 'PATCH'
                    ? 'hsl(var(--p-orange))'
                    : details.custom.method === 'DELETE'
                      ? 'destructive'
                      : 'secondary'
          "
        >
          {{ details.custom.method }}
        </PUIBadge>
        <span
          :title="details.custom.path + (details.custom.queryString ? '?' + details.custom.queryString : '')"
          class="p-details-title"
        >
          <strong>{{ details.custom.path }}</strong>
          <span class="pui-muted">{{ details.custom.queryString ? '?' + details.custom.queryString : '' }}</span>
        </span>
      </template>

      <template v-if="details" #details="{ scrollToTop }">
        <PUITabs
          :list="[
            ...(details.request ? [{ name: 'request', label: __('pruvious-dashboard', 'Request') }] : []),
            ...(details.response ? [{ name: 'response', label: __('pruvious-dashboard', 'Response') }] : []),
            { name: 'custom', label: __('pruvious-dashboard', 'Custom') },
          ]"
          @change="scrollToTop()"
          active="custom"
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

          <PUITab name="custom">
            <div class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Type') }}</span>
              </PUIFieldLabel>
              <PUIBadge color="accent">
                {{ details.custom.type }}
              </PUIBadge>
            </div>
            <div class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Severity') }}</span>
              </PUIFieldLabel>
              <PUIBadge color="secondary">
                {{ details.custom.severity }}
              </PUIBadge>
            </div>
            <div class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Message') }}</span>
              </PUIFieldLabel>
              <PUICode
                :code="details.custom.message"
                :copiedTooltip="__('pruvious-dashboard', 'Copied')"
                :copyTooltip="__('pruvious-dashboard', 'Copy to clipboard')"
                language="markdown"
              />
            </div>
            <div v-if="!isEmpty(details.custom.payload)" class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Payload') }}</span>
              </PUIFieldLabel>
              <PUICode
                :code="JSON.stringify(details.custom.payload, null, 2)"
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
                {{ dayjsFormatDateTime(details.custom.createdAt) }}
                <span class="pui-muted">({{ dayjsRelative(details.custom.createdAt) }})</span>
              </div>
            </div>
            <div v-if="details.custom.user" class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'User') }}</span>
              </PUIFieldLabel>
              <!-- @todo record preview -->
              <div>{{ details.custom.user }}</div>
            </div>
            <div class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Request debug ID') }}</span>
              </PUIFieldLabel>
              <PUICode
                :code="details.custom.requestDebugId"
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
  path: dashboardBasePath + 'logs/custom',
  middleware: [
    (to) => dashboardMiddleware(to, 'default'),
    (to) => dashboardMiddleware(to, 'auth-guard'),
    (to) =>
      dashboardMiddleware(to, ({ __, puiQueueToast, usePruviousDashboard }) => {
        if (!usePruviousDashboard().value?.logs?.custom) {
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
  title: __('pruvious-dashboard', 'Custom') + ' - ' + __('pruvious-dashboard', 'Logs'),
})

const route = useRoute()
const dashboard = usePruviousDashboard()
const canDeleteLogs = computed(() => hasPermission('delete-logs'))
const detailsId = ref<number | null>(null)
const details = ref<{
  request?: ({ id: number } & LogsDatabase['collections']['Requests']['TCastedTypes']) | null
  response?: ({ id: number } & LogsDatabase['collections']['Responses']['TCastedTypes']) | null
  custom: { id: number } & LogsDatabase['collections']['Custom']['TCastedTypes']
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
    },
    requestDebugId: {
      nullable: false,
      default: '',
      ui: { label: __('pruvious-dashboard', 'Request debug ID') },
      _fieldType: 'text',
      _dataType: 'text',
    },
    method: {
      nullable: false,
      default: '',
      choices: [{ value: 'GET' }, { value: 'POST' }, { value: 'PUT' }, { value: 'PATCH' }, { value: 'DELETE' }],
      ui: { label: __('pruvious-dashboard', 'HTTP Method') },
      _fieldType: 'select',
      _dataType: 'text',
    },
    path: {
      nullable: false,
      default: '',
      ui: { label: __('pruvious-dashboard', 'Path') },
      _fieldType: 'text',
      _dataType: 'text',
    },
    queryString: {
      nullable: false,
      default: '',
      ui: { label: __('pruvious-dashboard', 'Query string') },
      _fieldType: 'text',
      _dataType: 'text',
    },
    type: {
      nullable: false,
      default: '',
      ui: { label: __('pruvious-dashboard', 'Type') },
      _fieldType: 'text',
      _dataType: 'text',
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
    },
    message: {
      nullable: false,
      default: '',
      ui: { label: __('pruvious-dashboard', 'Message') },
      _fieldType: 'text',
      _dataType: 'text',
    },
    payload: {
      nullable: true,
      default: 'null',
      ui: { label: __('pruvious-dashboard', 'Payload') },
      _fieldType: 'text',
      _dataType: 'text',
    },
    user: {
      nullable: true,
      default: null,
      collection: 'Users',
      fields: ['id', 'email', 'firstName', 'lastName'],
      ui: { label: __('pruvious-dashboard', 'User') },
      _fieldType: 'record',
      _dataType: 'text',
    },
    createdAt: {
      nullable: false,
      default: '',
      ui: { label: __('pruvious-dashboard', 'Date') },
      _fieldType: 'timestamp',
      _dataType: 'numeric',
    },
  } as Record<string, Partial<GenericSerializableFieldOptions>>,
  ui: {
    indexPage: {
      table: {
        columns: ['type | 150px', 'message', 'severity | 150px', 'user | 150px', 'createdAt | 220px'],
        orderBy: 'createdAt:desc',
      },
    },
  },
} as SerializableCollection

watch(detailsId, async () => {
  let query = { ...route.query }
  delete query.details

  if (detailsId.value) {
    const custom = await logsQueryBuilder.selectFrom('Custom').where('id', '=', detailsId.value).first()

    if (custom.success && custom.data) {
      const related = await Promise.all([
        dashboard.value?.logs?.api && custom.data.requestDebugId
          ? logsQueryBuilder.selectFrom('Requests').where('requestDebugId', '=', custom.data.requestDebugId).first()
          : null,
        dashboard.value?.logs?.api && custom.data.requestDebugId
          ? logsQueryBuilder.selectFrom('Responses').where('requestDebugId', '=', custom.data.requestDebugId).first()
          : null,
      ])
      details.value = {
        request: related[0]?.data,
        response: related[1]?.data,
        custom: custom.data,
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
