<template>
  <PruviousDashboardPage>
    <div class="p-restore">
      <header :class="['p-restore-header', status ? `has-status-${status}` : '']">
        <div class="p-restore-icon">
          <Icon mode="svg" name="tabler:database-import" />
        </div>
        <div class="p-restore-headline">
          <div class="p-restore-eyebrow pui-muted">
            <NuxtLink :to="`${dashboardBasePath}collections/restores`" class="p-restore-back">
              <Icon mode="svg" name="tabler:arrow-left" class="pui-shrink-0" />
              <span class="pui-truncate">{{ __('pruvious-dashboard', 'Restores') }}</span>
            </NuxtLink>
            <span class="p-restore-eyebrow-sep">·</span>
            <span class="pui-shrink-0 pui-truncate">#{{ id }}</span>
            <template v-if="status">
              <span class="p-restore-eyebrow-sep">·</span>
              <span :class="['p-restore-status', `is-${status}`]">
                <Icon :name="statusIcon(status)" mode="svg" />
                {{ statusLabel(status) }}
              </span>
            </template>
          </div>
          <h1 class="p-restore-title">
            <NuxtLink
              v-if="response?.target"
              :to="`${dashboardBasePath}collections/deployment-targets/${response.target.id}`"
              class="p-restore-link pui-truncate"
            >
              {{ response.target.name }}
            </NuxtLink>
            <span v-if="response?.backup" class="p-restore-arrow pui-muted">·</span>
            <NuxtLink
              v-if="response?.backup"
              :to="`${dashboardBasePath}collections/backups/${response.backup.id}`"
              class="p-restore-link pui-truncate"
            >
              {{ __('pruvious-dashboard', 'Backup') }} #{{ response.backup.id }}
            </NuxtLink>
            <span v-if="response?.backup" class="p-restore-arrow pui-muted">·</span>
            <span v-if="response?.backup" class="pui-truncate">{{ typeLabel(response.backup.type) }}</span>
          </h1>
        </div>
      </header>

      <div v-if="response" class="p-restore-meta pui-muted">
        <span :title="__('pruvious-dashboard', 'Triggered by')" class="p-restore-meta-item">
          <Icon :name="response.triggeredBy ? 'tabler:user' : 'tabler:robot'" mode="svg" />
          {{ response.triggeredBy?.email ?? __('pruvious-dashboard', 'Auto') }}
        </span>
        <span
          v-if="response.restore.startedAt"
          v-pui-tooltip.nomd="{ content: dayjsFormatDateTime(response.restore.startedAt), offset: [0, 7] }"
          class="p-restore-meta-item"
        >
          <Icon mode="svg" name="tabler:clock" />
          {{ dayjsRelative(response.restore.startedAt) }}
        </span>
        <span v-if="duration" :title="__('pruvious-dashboard', 'Duration')" class="p-restore-meta-item">
          <Icon mode="svg" name="tabler:hourglass" />
          {{ duration }}
        </span>
      </div>

      <p v-if="response?.restore.error" class="p-restore-error">{{ response.restore.error }}</p>

      <section class="p-restore-log-section">
        <header class="p-restore-log-header">
          <h2>{{ __('pruvious-dashboard', 'Log') }}</h2>
          <span v-if="isStreaming" class="p-restore-log-live">
            <span class="p-restore-pulse"></span>
            {{ __('pruvious-dashboard', 'Live') }}
          </span>
        </header>
        <pre ref="logRef" class="p-restore-log">{{ log || ' ' }}</pre>
      </section>
    </div>
  </PruviousDashboardPage>
</template>

<script lang="ts" setup>
import { __ } from '#pruvious/app'
import { $pfetchDashboard, dashboardBasePath } from '#pruvious/dashboard'
import { dayjsFormatDateTime, dayjsRelative } from '#pruvious/dashboard/dayjs'
import { isNumber, isRealNumber } from '@pruvious/utils'

const props = defineProps<{
  id: number | string
}>()

interface RestoreResponse {
  restore: {
    id: number
    status: string
    startedAt: number | null
    finishedAt: number | null
    error: string | null
  }
  target: { id: number; name: string; type: string } | null
  backup: { id: number; type: string } | null
  triggeredBy: { id: number; email: string } | null
}

const id = computed(() => (isNumber(props.id) ? props.id : Number(props.id)))
const response = ref<RestoreResponse | null>(null)
const log = ref('')
const status = ref<string | null>(null)
const isStreaming = ref(false)
const logRef = useTemplateRef<HTMLPreElement>('logRef')

let source: EventSource | null = null

function formatDuration(ms: number): string {
  const sec = Math.round(ms / 1000)
  if (sec < 60) {
    return `${sec}s`
  }
  const min = Math.floor(sec / 60)
  const remSec = sec % 60
  if (min < 60) {
    return remSec ? `${min}m ${remSec}s` : `${min}m`
  }
  const hr = Math.floor(min / 60)
  const remMin = min % 60
  return remMin ? `${hr}h ${remMin}m` : `${hr}h`
}

const duration = computed(() => {
  const start = response.value?.restore.startedAt
  const finish = response.value?.restore.finishedAt
  if (!start || !finish) {
    return null
  }
  return formatDuration(finish - start)
})

function statusIcon(s: string): string {
  switch (s) {
    case 'success':
      return 'tabler:check'
    case 'failed':
      return 'tabler:x'
    case 'running':
      return 'tabler:loader-2'
    default:
      return 'tabler:clock'
  }
}

function statusLabel(s: string): string {
  switch (s) {
    case 'success':
      return __('pruvious-dashboard', 'Success')
    case 'failed':
      return __('pruvious-dashboard', 'Failed')
    case 'running':
      return __('pruvious-dashboard', 'Running')
    case 'queued':
      return __('pruvious-dashboard', 'Queued')
    default:
      return s
  }
}

function typeLabel(t: string): string {
  switch (t) {
    case 'db':
      return __('pruvious-dashboard', 'Database')
    case 'uploads':
      return __('pruvious-dashboard', 'Uploads')
    case 'full':
      return __('pruvious-dashboard', 'Full')
    default:
      return t
  }
}

async function loadRestore() {
  try {
    const data = (await $pfetchDashboard(`/api/hub/restores/${id.value}`)) as RestoreResponse
    response.value = data
    status.value = data.restore.status
  } catch (error: any) {
    log.value = `${__('pruvious-dashboard', 'Failed to load restore')}: ${error?.message ?? error}`
  }
}

function openLogStream() {
  if (source) {
    source.close()
  }
  isStreaming.value = true
  source = new EventSource(`/api/hub/restores/${id.value}/log`, { withCredentials: true })

  source.addEventListener('log', (e) => {
    const el = logRef.value
    const wasAtBottom = el ? el.scrollHeight - el.scrollTop - el.clientHeight < 32 : true
    log.value += (e as MessageEvent).data
    if (wasAtBottom) {
      nextTick(() => {
        if (logRef.value) {
          logRef.value.scrollTop = logRef.value.scrollHeight
        }
      })
    }
  })

  source.addEventListener('done', (e) => {
    status.value = (e as MessageEvent).data
    isStreaming.value = false
    source?.close()
    source = null
    void loadRestore()
  })

  source.addEventListener('error', () => {
    if (source?.readyState === EventSource.CLOSED) {
      isStreaming.value = false
    }
  })
}

onMounted(async () => {
  if (!isRealNumber(id.value)) {
    return
  }
  await loadRestore()
  openLogStream()
})

watch(
  () => props.id,
  async (next, prev) => {
    if (next === prev) {
      return
    }
    log.value = ''
    status.value = null
    source?.close()
    source = null
    await loadRestore()
    openLogStream()
  },
)

onBeforeUnmount(() => {
  source?.close()
  source = null
})
</script>

<style scoped>
:deep(.pui-container > .pui-container-content) {
  overflow: hidden;
}

:deep(.p-page-main) {
  height: 100%;
}

.p-restore {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
}

.p-restore-header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.875rem;
  padding: 0.75rem;
  padding-right: 1.1875rem;
  border-width: 1px;
  border-radius: var(--pui-radius);
  background-color: hsl(var(--pui-card));
}

.p-restore-header.has-status-success,
.p-restore-header.has-status-failed,
.p-restore-header.has-status-running {
  border-left-width: 3px;
}

.p-restore-header.has-status-success {
  border-left-color: hsl(var(--p-green));
}

.p-restore-header.has-status-failed {
  border-left-color: hsl(var(--pui-destructive));
}

.p-restore-header.has-status-running {
  border-left-color: hsl(var(--p-orange));
}

.p-restore-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--pui-radius);
  background-color: hsl(var(--pui-muted) / 0.6);
  color: hsl(var(--pui-foreground));
  font-size: 1.25rem;
}

.p-restore-headline {
  display: flex;
  flex-direction: column;
  gap: 0.21875rem;
  min-width: 0;
}

.p-restore-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.p-restore-eyebrow-sep {
  opacity: 0.6;
}

.p-restore-back {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: inherit;
  text-decoration: none;
}

.p-restore-back:hover {
  color: hsl(var(--pui-foreground));
}

.p-restore-title {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.p-restore-link {
  color: hsl(var(--pui-foreground));
  text-decoration: none;
}

.p-restore-arrow {
  font-weight: 400;
}

.p-restore-status {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.p-restore-status.is-success {
  color: hsl(var(--p-green));
}

.p-restore-status.is-failed {
  color: hsl(var(--pui-destructive));
}

.p-restore-status.is-running {
  color: hsl(var(--p-orange));
}

.p-restore-status :deep(svg) {
  font-size: 0.875em;
}

.p-restore-status.is-running :deep(svg) {
  animation: p-restore-spin 1s linear infinite;
}

@keyframes p-restore-spin {
  to {
    transform: rotate(360deg);
  }
}

.p-restore-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem 0.875rem;
  padding: 0 0.125rem;
  font-size: 0.8125rem;
}

.p-restore-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
  max-width: 100%;
}

.p-restore-meta-item :deep(svg) {
  flex-shrink: 0;
  font-size: 0.95em;
  opacity: 0.7;
}

.p-restore-error {
  margin: 0;
  padding: 0.75rem;
  border-width: 1px;
  border-color: hsl(var(--pui-destructive));
  border-radius: var(--pui-radius);
  background-color: hsl(var(--pui-destructive) / 0.1);
  color: hsl(var(--pui-destructive));
  font-size: 0.875rem;
  white-space: pre-wrap;
}

.p-restore-log-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  overflow: hidden;
}

.p-restore-log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.p-restore-log-header h2 {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: hsl(var(--pui-muted-foreground));
}

.p-restore-log-live {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  color: hsl(0 70% 45%);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.p-restore-pulse {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  background-color: hsl(0 70% 50%);
  animation: p-restore-pulse 1.4s ease-in-out infinite;
}

@keyframes p-restore-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

.p-restore-log {
  flex: 1;
  overflow: auto;
  margin: 0;
  padding: 0.75rem;
  border-width: 1px;
  border-radius: var(--pui-radius);
  background-color: hsl(var(--pui-card));
  color: hsl(var(--pui-card-foreground));
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.75rem;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}

@container (max-width: 640px) {
  .p-restore-header {
    grid-template-columns: auto 1fr;
    padding-right: 0.75rem;
  }
}
</style>
