<template>
  <PruviousDashboardPage noMainPadding noMainScroll>
    <PruviousDashboardLogs
      v-model:details="details"
      v-model:detailsId="detailsId"
      :canDeleteLogs="canDeleteLogs"
      :logCollectionDefinition="logCollectionDefinition"
      logCollectionName="Requests"
    >
      <template v-if="details" #detailsHeader>
        <PUIBadge
          :color="
            details.request.method === 'GET'
              ? 'hsl(var(--p-green))'
              : details.request.method === 'POST'
                ? 'hsl(var(--p-purple))'
                : details.request.method === 'PUT'
                  ? 'hsl(var(--p-yellow))'
                  : details.request.method === 'PATCH'
                    ? 'hsl(var(--p-orange))'
                    : details.request.method === 'DELETE'
                      ? 'destructive'
                      : 'secondary'
          "
        >
          {{ details.request.method }}
        </PUIBadge>
        <span
          :title="details.request.path + (details.request.queryString ? '?' + details.request.queryString : '')"
          class="p-details-title"
        >
          <strong>{{ details.request.path }}</strong>
          <span class="pui-muted">{{ details.request.queryString ? '?' + details.request.queryString : '' }}</span>
        </span>
      </template>

      <template v-if="details" #details="{ scrollToTop }">
        <PUITabs
          :list="[
            { name: 'request', label: __('pruvious-dashboard', 'Request') },
            ...(details.response ? [{ name: 'response', label: __('pruvious-dashboard', 'Response') }] : []),
            ...(details.queries?.length ? [{ name: 'queries', label: __('pruvious-dashboard', 'Queries') }] : []),
          ]"
          @change="scrollToTop()"
          active="request"
        >
          <PUITab name="request">
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

          <PUITab v-if="details.queries?.length" name="queries">
            <div v-for="(query, i) of details.queries" class="p-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Query') }} #{{ i + 1 }}</span>
              </PUIFieldLabel>
              <PUICode
                :code="beautifyQuery(query)"
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
import { beautifyCode, beautifyQuery, beautifyQueryString } from '../../../utils/pruvious/dashboard/beautify'
import { logsQueryBuilder } from '../../../utils/pruvious/dashboard/logs'

definePageMeta({
  path: dashboardBasePath + 'logs/requests',
  middleware: [
    (to) => dashboardMiddleware(to, 'default'),
    (to) => dashboardMiddleware(to, 'auth-guard'),
    (to) =>
      dashboardMiddleware(to, ({ __, puiQueueToast, usePruviousDashboard }) => {
        if (!usePruviousDashboard().value?.logs?.api) {
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
  title: __('pruvious-dashboard', 'Requests') + ' - ' + __('pruvious-dashboard', 'Logs'),
})

const route = useRoute()
const dashboard = usePruviousDashboard()
const canDeleteLogs = computed(() => hasPermission('delete-logs'))
const detailsId = ref<number | null>(null)
const details = ref<{
  request: { id: number } & LogsDatabase['collections']['Requests']['TCastedTypes']
  response?: ({ id: number } & LogsDatabase['collections']['Responses']['TCastedTypes']) | null
  queries?: ({ id: number } & LogsDatabase['collections']['Queries']['TCastedTypes'])[]
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
    headers: {
      nullable: false,
      default: '',
      ui: { label: __('pruvious-dashboard', 'Headers') },
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
    body: {
      nullable: true,
      default: '',
      ui: { label: __('pruvious-dashboard', 'Body') },
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
        columns: ['method | 150px', 'path', 'queryString | 150px', 'user | 150px', 'createdAt | 220px'],
        orderBy: 'createdAt:desc',
      },
    },
  },
} as SerializableCollection

watch(detailsId, async () => {
  let query = { ...route.query }
  delete query.details

  if (detailsId.value) {
    const request = await logsQueryBuilder.selectFrom('Requests').where('id', '=', detailsId.value).first()

    if (request.success && request.data) {
      const related = await Promise.all([
        logsQueryBuilder.selectFrom('Responses').where('requestDebugId', '=', request.data.requestDebugId).first(),
        dashboard.value?.logs?.queries
          ? logsQueryBuilder
              .selectFrom('Queries')
              .where('requestDebugId', '=', request.data.requestDebugId)
              .orderBy('createdAt', 'asc')
              .all()
          : undefined,
      ])
      details.value = {
        request: request.data,
        response: related[0].data,
        queries: related[1]?.data,
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
