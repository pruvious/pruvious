<template>
  <PruviousDashboardPage>
    <div class="p-scaffold-view">
      <header :class="['p-scaffold-view-header', status ? `has-status-${status}` : '']">
        <div class="p-scaffold-view-icon">
          <Icon mode="svg" name="tabler:wand" />
        </div>

        <div class="p-scaffold-view-headline">
          <div class="p-scaffold-view-eyebrow pui-muted">
            <NuxtLink :to="`${dashboardBasePath}collections/projects`" class="p-scaffold-view-back">
              <Icon mode="svg" name="tabler:arrow-left" class="pui-shrink-0" />
              <span class="pui-truncate">{{ __('pruvious-dashboard', 'Pruvious projects') }}</span>
            </NuxtLink>
            <span class="p-scaffold-view-eyebrow-sep">·</span>
            <span class="pui-shrink-0 pui-truncate">#{{ id }}</span>
            <template v-if="status">
              <span class="p-scaffold-view-eyebrow-sep">·</span>
              <span :class="['p-scaffold-view-status', `is-${status}`]">
                <Icon :name="statusIcon(status)" mode="svg" />
                {{ statusLabel(status) }}
              </span>
            </template>
          </div>
          <h1 class="p-scaffold-view-title">
            <span class="pui-truncate">{{ response?.scaffold?.name ?? __('pruvious-dashboard', 'Scaffolding') }}</span>
          </h1>
        </div>

        <div v-if="canRetry" class="p-scaffold-view-actions">
          <PUIButton
            v-pui-tooltip="
              __('pruvious-dashboard', 'Run the scaffold again with the same settings (overwrites the partial directory)')
            "
            :disabled="retrying"
            :size="-1"
            @click="retry()"
            type="button"
          >
            <Icon mode="svg" name="tabler:refresh" />
            <span>{{ retrying ? __('pruvious-dashboard', 'Queued') : __('pruvious-dashboard', 'Retry') }}</span>
          </PUIButton>
        </div>
      </header>

      <div v-if="response" class="p-scaffold-view-meta pui-muted">
        <span :title="__('pruvious-dashboard', 'Target directory')" class="p-scaffold-view-meta-item pui-truncate">
          <Icon mode="svg" name="tabler:folder" />
          <code :title="response.scaffold.targetDir" class="pui-truncate">{{ response.scaffold.targetDir }}</code>
        </span>
        <span :title="__('pruvious-dashboard', 'Package manager')" class="p-scaffold-view-meta-item">
          <Icon mode="svg" name="tabler:package" />
          {{ response.scaffold.packageManager }}
        </span>
        <span :title="__('pruvious-dashboard', 'Pruvious version or dist-tag')" class="p-scaffold-view-meta-item">
          <Icon mode="svg" name="tabler:tag" />
          <code>{{ response.scaffold.pruviousSpec }}</code>
        </span>
        <span :title="__('pruvious-dashboard', 'Language code')" class="p-scaffold-view-meta-item">
          <Icon mode="svg" name="tabler:language" />
          {{ response.scaffold.languageCode }}
        </span>
        <span :title="__('pruvious-dashboard', 'Triggered by')" class="p-scaffold-view-meta-item">
          <Icon :name="response.triggeredBy ? 'tabler:user' : 'tabler:robot'" mode="svg" />
          {{ response.triggeredBy?.email ?? __('pruvious-dashboard', 'Auto') }}
        </span>
      </div>

      <p v-if="response?.scaffold.error" class="p-scaffold-view-error">{{ response.scaffold.error }}</p>

      <section class="p-scaffold-view-log-section">
        <header class="p-scaffold-view-log-header">
          <h2>{{ __('pruvious-dashboard', 'Log') }}</h2>
          <span v-if="isStreaming" class="p-scaffold-view-log-live">
            <span class="p-scaffold-view-pulse"></span>
            {{ __('pruvious-dashboard', 'Live') }}
          </span>
        </header>
        <pre ref="logRef" class="p-scaffold-view-log">{{ log || ' ' }}</pre>
      </section>
    </div>
  </PruviousDashboardPage>
</template>

<script lang="ts" setup>
import { __ } from '#pruvious/app'
import { $pfetchDashboard, dashboardBasePath } from '#pruvious/dashboard'
import { isNumber, isRealNumber } from '@pruvious/utils'

const props = defineProps<{
  id: number | string
}>()

interface ScaffoldResponse {
  scaffold: {
    id: number
    name: string
    targetDir: string
    parentDir: string
    languageCode: string
    languageName: string | null
    packageManager: 'npm' | 'pnpm'
    pruviousSpec: string
    install: boolean
    force: boolean
    status: string
    startedAt: number | null
    finishedAt: number | null
    error: string | null
    logPath: string | null
  }
  project: { id: number; name: string } | null
  triggeredBy: { id: number; email: string } | null
}

const id = computed(() => (isNumber(props.id) ? props.id : Number(props.id)))

const response = ref<ScaffoldResponse | null>(null)
const log = ref('')
const status = ref<string | null>(null)
const isStreaming = ref(false)
const retrying = ref(false)
const canRetry = computed(() => status.value === 'failed')
const logRef = useTemplateRef<HTMLPreElement>('logRef')

let source: EventSource | null = null

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

async function retry() {
  if (retrying.value || !canRetry.value) {
    return
  }
  retrying.value = true
  try {
    const { scaffoldId } = (await $pfetchDashboard(`/api/hub/scaffolds/${id.value}/retry`, {
      method: 'POST',
    })) as { scaffoldId: number }
    await navigateTo(`${dashboardBasePath}collections/scaffolds/${scaffoldId}`)
  } catch (err: any) {
    log.value += `\n[hub-ui] retry failed: ${err?.data?.statusMessage ?? err?.message ?? 'unknown'}\n`
  } finally {
    retrying.value = false
  }
}

async function loadScaffold() {
  try {
    const data = (await $pfetchDashboard(`/api/hub/scaffolds/${id.value}`)) as ScaffoldResponse
    response.value = data
    status.value = data.scaffold.status
  } catch (error: any) {
    log.value = `${__('pruvious-dashboard', 'Failed to load scaffold')}: ${error?.message ?? error}`
  }
}

function openLogStream() {
  if (source) {
    source.close()
  }

  isStreaming.value = true
  source = new EventSource(`/api/hub/scaffolds/${id.value}/log`, { withCredentials: true })

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

  source.addEventListener('done', async (e) => {
    status.value = (e as MessageEvent).data
    isStreaming.value = false
    source?.close()
    source = null
    await loadScaffold()
    const projectId = response.value?.project?.id
    if (status.value === 'success' && projectId) {
      await navigateTo(`${dashboardBasePath}collections/projects/${projectId}`)
    }
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
  await loadScaffold()
  if (status.value === 'success' && response.value?.project?.id) {
    await navigateTo(`${dashboardBasePath}collections/projects/${response.value.project.id}`)
    return
  }
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
    await loadScaffold()
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

.p-scaffold-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
}

.p-scaffold-view-header {
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

.p-scaffold-view-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.p-scaffold-view-header.has-status-success,
.p-scaffold-view-header.has-status-failed,
.p-scaffold-view-header.has-status-running {
  border-left-width: 3px;
}

.p-scaffold-view-header.has-status-success {
  border-left-color: hsl(var(--p-green));
}

.p-scaffold-view-header.has-status-failed {
  border-left-color: hsl(var(--pui-destructive));
}

.p-scaffold-view-header.has-status-running {
  border-left-color: hsl(var(--p-orange));
}

.p-scaffold-view-icon {
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

.p-scaffold-view-headline {
  display: flex;
  flex-direction: column;
  gap: 0.21875rem;
  min-width: 0;
}

.p-scaffold-view-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.p-scaffold-view-eyebrow-sep {
  opacity: 0.6;
}

.p-scaffold-view-back {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: inherit;
  text-decoration: none;
}

.p-scaffold-view-back:hover {
  color: hsl(var(--pui-foreground));
}

.p-scaffold-view-title {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.p-scaffold-view-status {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.p-scaffold-view-status.is-success {
  color: hsl(var(--p-green));
}

.p-scaffold-view-status.is-failed {
  color: hsl(var(--pui-destructive));
}

.p-scaffold-view-status.is-running {
  color: hsl(var(--p-orange));
}

.p-scaffold-view-status.is-running :deep(svg) {
  animation: p-scaffold-view-spin 1s linear infinite;
}

@keyframes p-scaffold-view-spin {
  to {
    transform: rotate(360deg);
  }
}

.p-scaffold-view-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem 0.875rem;
  padding: 0 0.125rem;
  font-size: 0.8125rem;
}

.p-scaffold-view-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
  max-width: 100%;
}

.p-scaffold-view-meta-item :deep(svg) {
  flex-shrink: 0;
  font-size: 0.95em;
  opacity: 0.7;
}

.p-scaffold-view-meta-item code {
  padding: 0.0625rem 0.3125rem;
  border-radius: calc(var(--pui-radius) - 0.25rem);
  background-color: hsl(var(--pui-muted) / 0.6);
  color: hsl(var(--pui-foreground));
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.75rem;
}

.p-scaffold-view-error {
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

.p-scaffold-view-log-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  overflow: hidden;
}

.p-scaffold-view-log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.p-scaffold-view-log-header h2 {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: hsl(var(--pui-muted-foreground));
}

.p-scaffold-view-log-live {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  color: hsl(0 70% 45%);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.p-scaffold-view-pulse {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  background-color: hsl(0 70% 50%);
  animation: p-scaffold-view-pulse 1.4s ease-in-out infinite;
}

@keyframes p-scaffold-view-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

.p-scaffold-view-log {
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
</style>
