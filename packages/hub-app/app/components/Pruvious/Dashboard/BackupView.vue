<template>
  <PruviousDashboardPage>
    <div class="p-backup">
      <header :class="['p-backup-header', status ? `has-status-${status}` : '']">
        <div class="p-backup-icon">
          <Icon mode="svg" name="tabler:database-export" />
        </div>

        <div class="p-backup-headline">
          <div class="p-backup-eyebrow pui-muted">
            <NuxtLink :to="`${dashboardBasePath}collections/backups`" class="p-backup-back">
              <Icon mode="svg" name="tabler:arrow-left" class="pui-shrink-0" />
              <span class="pui-truncate">{{ __('pruvious-dashboard', 'Backups') }}</span>
            </NuxtLink>
            <span class="p-backup-eyebrow-sep">·</span>
            <span class="pui-shrink-0 pui-truncate">#{{ id }}</span>
            <template v-if="status">
              <span class="p-backup-eyebrow-sep">·</span>
              <span :class="['p-backup-status', `is-${status}`]">
                <Icon :name="statusIcon(status)" mode="svg" />
                {{ statusLabel(status) }}
              </span>
            </template>
          </div>
          <h1 class="p-backup-title">
            <NuxtLink
              v-if="response?.target"
              :to="`${dashboardBasePath}collections/deployment-targets/${response.target.id}`"
              class="p-backup-link pui-truncate"
            >
              {{ response.target.name }}
            </NuxtLink>
            <span v-if="response" class="p-backup-arrow pui-muted">·</span>
            <span v-if="response" class="pui-truncate">{{ typeLabel(response.backup.type) }}</span>
          </h1>
        </div>

        <div class="p-backup-actions">
          <PUIButton
            v-if="response && status === 'success'"
            :disabled="restoring"
            :size="-1"
            @click="restore()"
            type="button"
          >
            <Icon mode="svg" name="tabler:database-import" />
            <span>{{ restoring ? __('pruvious-dashboard', 'Queued') : __('pruvious-dashboard', 'Restore') }}</span>
          </PUIButton>
        </div>
      </header>

      <div v-if="response" class="p-backup-meta pui-muted">
        <span :title="__('pruvious-dashboard', 'Triggered by')" class="p-backup-meta-item">
          <Icon :name="response.triggeredBy ? 'tabler:user' : 'tabler:robot'" mode="svg" />
          {{ response.triggeredBy?.email ?? __('pruvious-dashboard', 'Auto') }}
        </span>
        <span
          v-if="response.backup.startedAt"
          v-pui-tooltip.nomd="{ content: dayjsFormatDateTime(response.backup.startedAt), offset: [0, 7] }"
          class="p-backup-meta-item"
        >
          <Icon mode="svg" name="tabler:clock" />
          {{ dayjsRelative(response.backup.startedAt) }}
        </span>
        <span v-if="duration" :title="__('pruvious-dashboard', 'Duration')" class="p-backup-meta-item">
          <Icon mode="svg" name="tabler:hourglass" />
          {{ duration }}
        </span>
        <span v-if="response.backup.sizeBytes > 0" :title="__('pruvious-dashboard', 'Size')" class="p-backup-meta-item">
          <Icon mode="svg" name="tabler:package" />
          {{ formatBytes(response.backup.sizeBytes) }}
        </span>
      </div>

      <p v-if="response?.backup.error" class="p-backup-error">{{ response.backup.error }}</p>

      <section class="p-backup-log-section">
        <header class="p-backup-log-header">
          <h2>{{ __('pruvious-dashboard', 'Log') }}</h2>
          <span v-if="isStreaming" class="p-backup-log-live">
            <span class="p-backup-pulse"></span>
            {{ __('pruvious-dashboard', 'Live') }}
          </span>
        </header>
        <pre ref="logRef" class="p-backup-log">{{ log || ' ' }}</pre>
      </section>
    </div>
  </PruviousDashboardPage>
</template>

<script lang="ts" setup>
import { __ } from '#pruvious/app'
import { $pfetchDashboard, dashboardBasePath } from '#pruvious/dashboard'
import { dayjsFormatDateTime, dayjsRelative } from '#pruvious/dashboard/dayjs'
import { puiDialog } from '@pruvious/ui/pui/dialog'
import { isNumber, isRealNumber } from '@pruvious/utils'

const props = defineProps<{
  id: number | string
}>()

interface BackupResponse {
  backup: {
    id: number
    type: 'db' | 'uploads' | 'full'
    status: string
    startedAt: number | null
    finishedAt: number | null
    sizeBytes: number
    error: string | null
    storagePath: string | null
  }
  target: { id: number; name: string; type: string } | null
  triggeredBy: { id: number; email: string } | null
}

const id = computed(() => (isNumber(props.id) ? props.id : Number(props.id)))

const response = ref<BackupResponse | null>(null)
const log = ref('')
const status = ref<string | null>(null)
const isStreaming = ref(false)
const restoring = ref(false)
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
  const start = response.value?.backup.startedAt
  const finish = response.value?.backup.finishedAt
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i++
  }
  return `${value.toFixed(1)} ${units[i]}`
}

async function loadBackup() {
  try {
    const data = (await $pfetchDashboard(`/api/hub/backups/${id.value}`)) as BackupResponse
    response.value = data
    status.value = data.backup.status
  } catch (error: any) {
    log.value = `${__('pruvious-dashboard', 'Failed to load backup')}: ${error?.message ?? error}`
  }
}

function openLogStream() {
  if (source) {
    source.close()
  }

  isStreaming.value = true
  source = new EventSource(`/api/hub/backups/${id.value}/log`, { withCredentials: true })

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
    void loadBackup()
  })

  source.addEventListener('error', () => {
    if (source?.readyState === EventSource.CLOSED) {
      isStreaming.value = false
    }
  })
}

async function restore() {
  if (!response.value?.target) {
    return
  }

  const action = await puiDialog({
    content: __(
      'pruvious-dashboard',
      'This will overwrite the current state of **$target** with the contents of this backup. This action cannot be undone.',
      { target: response.value.target.name },
    ),
    actions: [
      { name: 'cancel', label: __('pruvious-dashboard', 'Cancel') },
      { name: 'restore', label: __('pruvious-dashboard', 'Restore'), variant: 'destructive' },
    ],
  })

  if (action !== 'restore') {
    return
  }

  restoring.value = true
  try {
    const { restoreId } = (await $pfetchDashboard(`/api/hub/backups/${id.value}/restore`, {
      method: 'POST',
      body: { confirm: true, wipeMissingObjects: true },
    })) as { restoreId: number }
    await navigateTo(`${dashboardBasePath}collections/restores/${restoreId}`)
  } catch (error: any) {
    log.value += `\n[hub-ui] restore failed: ${error?.data?.statusMessage ?? error?.message ?? 'unknown'}\n`
  } finally {
    restoring.value = false
  }
}

onMounted(async () => {
  if (!isRealNumber(id.value)) {
    return
  }
  await loadBackup()
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
    await loadBackup()
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

.p-backup {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
}

/* --- Header card --- */

.p-backup-header {
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

.p-backup-header.has-status-success,
.p-backup-header.has-status-failed,
.p-backup-header.has-status-running {
  border-left-width: 3px;
}

.p-backup-header.has-status-success {
  border-left-color: hsl(var(--p-green));
}

.p-backup-header.has-status-failed {
  border-left-color: hsl(var(--pui-destructive));
}

.p-backup-header.has-status-running {
  border-left-color: hsl(var(--p-orange));
}

.p-backup-icon {
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

.p-backup-headline {
  display: flex;
  flex-direction: column;
  gap: 0.21875rem;
  min-width: 0;
}

.p-backup-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.p-backup-eyebrow-sep {
  opacity: 0.6;
}

.p-backup-back {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: inherit;
  text-decoration: none;
}

.p-backup-back:hover {
  color: hsl(var(--pui-foreground));
}

.p-backup-title {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.p-backup-link {
  color: hsl(var(--pui-foreground));
  text-decoration: none;
}

.p-backup-arrow {
  font-weight: 400;
}

.p-backup-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.p-backup-status {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.p-backup-status.is-success {
  color: hsl(var(--p-green));
}

.p-backup-status.is-failed {
  color: hsl(var(--pui-destructive));
}

.p-backup-status.is-running {
  color: hsl(var(--p-orange));
}

.p-backup-status :deep(svg) {
  font-size: 0.875em;
}

.p-backup-status.is-running :deep(svg) {
  animation: p-backup-spin 1s linear infinite;
}

@keyframes p-backup-spin {
  to {
    transform: rotate(360deg);
  }
}

/* --- Meta line --- */

.p-backup-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem 0.875rem;
  padding: 0 0.125rem;
  font-size: 0.8125rem;
}

.p-backup-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
  max-width: 100%;
}

.p-backup-meta-item :deep(svg) {
  flex-shrink: 0;
  font-size: 0.95em;
  opacity: 0.7;
}

/* --- Error banner --- */

.p-backup-error {
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

/* --- Log section (stretches to fill remaining height) --- */

.p-backup-log-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  overflow: hidden;
}

.p-backup-log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.p-backup-log-header h2 {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: hsl(var(--pui-muted-foreground));
}

.p-backup-log-live {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  color: hsl(0 70% 45%);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.p-backup-pulse {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  background-color: hsl(0 70% 50%);
  animation: p-backup-pulse 1.4s ease-in-out infinite;
}

@keyframes p-backup-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

.p-backup-log {
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
  .p-backup-header {
    grid-template-columns: auto 1fr;
    grid-template-areas:
      'icon headline'
      'actions actions';
    row-gap: 0.75rem;
    padding-right: 0.75rem;
  }
  .p-backup-header > .p-backup-icon {
    grid-area: icon;
  }
  .p-backup-header > .p-backup-headline {
    grid-area: headline;
  }
  .p-backup-header > .p-backup-actions {
    grid-area: actions;
    justify-content: flex-end;
  }
  .p-backup-actions :deep(.pui-button) {
    --pui-size: -2 !important;
  }
}
</style>
