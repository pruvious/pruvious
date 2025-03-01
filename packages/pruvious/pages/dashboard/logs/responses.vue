<template>
  <PruviousDashboardPage noMainPadding>
    <PruviousDashboardLogs
      v-model:details="details"
      v-model:detailsId="detailsId"
      :canDeleteLogs="canDeleteLogs"
      :columns="columns"
      logCollection="Responses"
    >
      <template #cell="{ row, key }">
        <PUIBadge
          v-if="key === 'method'"
          :color="
            row[key] === 'GET'
              ? 'hsl(var(--p-green))'
              : row[key] === 'POST'
                ? 'hsl(var(--p-purple))'
                : row[key] === 'PUT'
                  ? 'hsl(var(--p-yellow))'
                  : row[key] === 'PATCH'
                    ? 'hsl(var(--p-orange))'
                    : row[key] === 'DELETE'
                      ? 'destructive'
                      : 'secondary'
          "
        >
          {{ row[key] }}
        </PUIBadge>

        <code
          v-else-if="key === 'path'"
          :title="row[key] ? String(row[key]) : undefined"
          class="pui-truncate p-cell-foreground"
        >
          {{ row[key] }}
        </code>

        <code
          v-else-if="key === 'queryString'"
          :title="row[key] ? '?' + String(row[key]) : undefined"
          class="pui-truncate"
        >
          {{ row[key] ? '?' + row[key] : '' }}
        </code>

        <PUIBadge
          v-else-if="key === 'statusCode'"
          :color="
            row[key] >= 200 && row[key] < 300
              ? 'hsl(var(--p-green))'
              : row[key] >= 400 && row[key] < 500
                ? 'hsl(var(--p-orange))'
                : row[key] >= 500
                  ? 'destructive'
                  : 'accent'
          "
        >
          {{ row[key] }}
        </PUIBadge>

        <span v-else :title="row[key] ? String(row[key]) : undefined" class="pui-truncate">
          {{ row[key] }}
        </span>
      </template>

      <template v-if="details" #detailsHeader>
        <PUIBadge
          :color="
            details.response.method === 'GET'
              ? 'hsl(var(--p-green))'
              : details.response.method === 'POST'
                ? 'hsl(var(--p-purple))'
                : details.response.method === 'PUT'
                  ? 'hsl(var(--p-yellow))'
                  : details.response.method === 'PATCH'
                    ? 'hsl(var(--p-orange))'
                    : details.response.method === 'DELETE'
                      ? 'destructive'
                      : 'secondary'
          "
        >
          {{ details.response.method }}
        </PUIBadge>
        <span
          :title="details.response.path + (details.response.queryString ? '?' + details.response.queryString : '')"
          class="p-details-title"
        >
          <strong>{{ details.response.path }}</strong>
          <span class="pui-muted">{{ details.response.queryString ? '?' + details.response.queryString : '' }}</span>
        </span>
      </template>

      <template v-if="details" #details>
        <PUITabs
          :list="[
            ...(details.request ? [{ name: 'request', label: __('pruvious-dashboard', 'Request') }] : []),
            { name: 'response', label: __('pruvious-dashboard', 'Response') },
            ...(details.queries?.length ? [{ name: 'queries', label: __('pruvious-dashboard', 'Queries') }] : []),
          ]"
          active="response"
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
              <!-- @todo datetime preview -->
              <div>{{ details.request.createdAt }}</div>
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

          <PUITab name="response">
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
              <!-- @todo datetime preview -->
              <div>{{ details.response.createdAt }}</div>
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
import { __, dashboardBasePath, hasPermission, usePruviousDashboard } from '#pruvious/client'
import type { LogsDatabase } from '#pruvious/server'
import { beautifyCode, beautifyQuery, beautifyQueryString } from '../../../utils/pruvious/dashboard/beautify'
import { logsQueryBuilder } from '../../../utils/pruvious/dashboard/logs'

definePageMeta({
  path: dashboardBasePath + 'logs/responses',
  middleware: [
    'pruvious-dashboard',
    'pruvious-dashboard-auth-guard',
    (to) => {
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
    },
  ],
})

useHead({
  title: __('pruvious-dashboard', 'Responses') + ' - ' + __('pruvious-dashboard', 'Logs'),
})

const route = useRoute()
const dashboard = usePruviousDashboard()
const canDeleteLogs = computed(() => hasPermission('delete-logs'))
const detailsId = ref<number | null>(null)
const details = ref<{
  request?: ({ id: number } & LogsDatabase['collections']['Requests']['TCastedTypes']) | null
  response: { id: number } & LogsDatabase['collections']['Responses']['TCastedTypes']
  queries?: ({ id: number } & LogsDatabase['collections']['Queries']['TCastedTypes'])[]
} | null>(null)
const columns: PUIColumns = {
  method: puiColumn<string>({ label: __('pruvious-dashboard', 'HTTP Method'), width: '10rem', sortable: 'text' }),
  path: puiColumn<string>({ label: __('pruvious-dashboard', 'Path'), width: '16rem', sortable: 'text' }),
  queryString: puiColumn<string>({ label: __('pruvious-dashboard', 'Query string'), width: '10rem', sortable: 'text' }),
  statusCode: puiColumn<number>({
    label: __('pruvious-dashboard', 'Status code'),
    width: '10rem',
    sortable: 'numeric',
  }),
  createdAt: puiColumn<number>({ label: __('pruvious-dashboard', 'Date'), width: '10rem', sortable: 'numeric' }),
}

watch(detailsId, async () => {
  let query = { ...route.query }
  delete query.details

  if (detailsId.value) {
    const response = await logsQueryBuilder.selectFrom('Responses').where('id', '=', detailsId.value).first()

    if (response.success && response.data) {
      const related = await Promise.all([
        logsQueryBuilder.selectFrom('Requests').where('requestDebugId', '=', response.data.requestDebugId).first(),
        dashboard.value?.logs?.queries
          ? logsQueryBuilder
              .selectFrom('Queries')
              .where('requestDebugId', '=', response.data.requestDebugId)
              .orderBy('createdAt', 'asc')
              .all()
          : undefined,
      ])
      details.value = {
        request: related[0].data,
        response: response.data,
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
