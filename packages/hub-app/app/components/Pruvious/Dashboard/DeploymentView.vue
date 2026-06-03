<template>
  <PruviousDashboardPage>
    <div class="p-deploy">
      <header :class="['p-deploy-header', status ? `has-status-${status}` : '']">
        <div :class="['p-deploy-icon', response?.target ? `is-${response.target.type}` : '']">
          <Icon :name="response?.target ? providerIcon(response.target.type) : 'tabler:rocket'" mode="svg" />
        </div>

        <div class="p-deploy-headline">
          <div class="p-deploy-eyebrow pui-muted">
            <NuxtLink :to="`${dashboardBasePath}collections/deployments`" class="p-deploy-back">
              <Icon mode="svg" name="tabler:arrow-left" class="pui-shrink-0" />
              <span class="pui-truncate">{{ __('pruvious-dashboard', 'Deployments') }}</span>
            </NuxtLink>
            <span class="p-deploy-eyebrow-sep">·</span>
            <span class="pui-shrink-0 pui-truncate">#{{ id }}</span>
            <template v-if="status">
              <span class="p-deploy-eyebrow-sep">·</span>
              <span :class="['p-deploy-status', `is-${status}`]">
                <Icon :name="statusIcon(status)" mode="svg" />
                {{ statusLabel(status) }}
              </span>
            </template>
          </div>
          <h1 class="p-deploy-title">
            <NuxtLink
              v-if="response?.project?.id"
              :to="`${dashboardBasePath}collections/projects/${response.project.id}`"
              class="p-deploy-link pui-truncate"
            >
              {{ response.project.name }}
            </NuxtLink>
            <span v-if="response?.target" class="p-deploy-arrow pui-muted">/</span>
            <NuxtLink
              v-if="response?.target"
              :to="`${dashboardBasePath}collections/deployment-targets/${response.target.id}`"
              class="p-deploy-link pui-truncate"
            >
              {{ response.target.name }}
            </NuxtLink>
          </h1>
        </div>

        <div class="p-deploy-actions">
          <PUIButton
            v-if="response?.target"
            :disabled="!canRedeploy || redeploying"
            :size="-1"
            :title="
              canRedeploy ? '' : __('pruvious-dashboard', 'A deployment is already queued or running for this target')
            "
            @click="redeploy()"
            type="button"
          >
            <Icon mode="svg" name="tabler:refresh" />
            <span>{{ redeploying ? __('pruvious-dashboard', 'Queued') : __('pruvious-dashboard', 'Redeploy') }}</span>
          </PUIButton>
        </div>
      </header>

      <div v-if="response" class="p-deploy-meta pui-muted">
        <span v-if="response.deployment.branch" :title="__('pruvious-dashboard', 'Branch')" class="p-deploy-meta-item">
          <Icon mode="svg" name="tabler:git-branch" />
          {{ response.deployment.branch }}
        </span>
        <span v-if="response.deployment.commit" :title="__('pruvious-dashboard', 'Commit')" class="p-deploy-meta-item">
          <Icon mode="svg" name="tabler:git-commit" />
          <code>{{ response.deployment.commit.slice(0, 7) }}</code>
        </span>
        <span :title="__('pruvious-dashboard', 'Triggered by')" class="p-deploy-meta-item">
          <Icon :name="response.triggeredBy ? 'tabler:user' : 'tabler:robot'" mode="svg" />
          {{ response.triggeredBy?.email ?? __('pruvious-dashboard', 'Auto') }}
        </span>
        <span
          v-if="response.deployment.startedAt"
          v-pui-tooltip.nomd="{ content: dayjsFormatDateTime(response.deployment.startedAt), offset: [0, 7] }"
          class="p-deploy-meta-item"
        >
          <Icon mode="svg" name="tabler:clock" />
          {{ dayjsRelative(response.deployment.startedAt) }}
        </span>
        <span v-if="duration" :title="__('pruvious-dashboard', 'Duration')" class="p-deploy-meta-item">
          <Icon mode="svg" name="tabler:hourglass" />
          {{ duration }}
        </span>
      </div>

      <p v-if="response?.deployment.error" class="p-deploy-error">{{ response.deployment.error }}</p>

      <section class="p-deploy-log-section">
        <header class="p-deploy-log-header">
          <h2>{{ __('pruvious-dashboard', 'Log') }}</h2>
          <span v-if="isStreaming" class="p-deploy-log-live">
            <span class="p-deploy-pulse"></span>
            {{ __('pruvious-dashboard', 'Live') }}
          </span>
        </header>
        <pre ref="logRef" class="p-deploy-log">{{ log || ' ' }}</pre>
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

interface DeploymentResponse {
  deployment: {
    id: number
    status: string
    branch: string | null
    commit: string | null
    startedAt: number | null
    finishedAt: number | null
    error: string | null
    logPath: string | null
  }
  target: { id: number; name: string; type: string } | null
  project: { id: number; name: string } | null
  triggeredBy: { id: number; email: string } | null
  canRedeploy: boolean
}

const id = computed(() => (isNumber(props.id) ? props.id : Number(props.id)))

const response = ref<DeploymentResponse | null>(null)
const log = ref('')
const status = ref<string | null>(null)
const isStreaming = ref(false)
const redeploying = ref(false)
const canRedeploy = computed(() => response.value?.canRedeploy ?? false)
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
  const start = response.value?.deployment.startedAt
  const finish = response.value?.deployment.finishedAt
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

function providerIcon(type: string): string {
  switch (type) {
    case 'cloudflare':
      return 'tabler:brand-cloudflare'
    case 'vercel':
      return 'tabler:brand-vercel'
    case 'netlify':
      return 'tabler:brand-netlify'
    case 'vps':
      return 'tabler:server-2'
    default:
      return 'tabler:rocket'
  }
}

async function loadDeployment() {
  try {
    const data = (await $pfetchDashboard(`/api/hub/deployments/${id.value}`)) as DeploymentResponse
    response.value = data
    status.value = data.deployment.status
  } catch (error: any) {
    log.value = `${__('pruvious-dashboard', 'Failed to load deployment')}: ${error?.message ?? error}`
  }
}

function openLogStream() {
  if (source) {
    source.close()
  }

  isStreaming.value = true
  source = new EventSource(`/api/hub/deployments/${id.value}/log`, { withCredentials: true })

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
    void loadDeployment()
  })

  source.addEventListener('error', () => {
    if (source?.readyState === EventSource.CLOSED) {
      isStreaming.value = false
    }
  })
}

async function redeploy() {
  if (!response.value?.target) {
    return
  }
  redeploying.value = true
  try {
    const { deploymentId } = (await $pfetchDashboard(`/api/hub/targets/${response.value.target.id}/deploy`, {
      method: 'POST',
    })) as { deploymentId: number }
    await navigateTo(`${dashboardBasePath}collections/deployments/${deploymentId}`)
  } catch (error: any) {
    log.value += `\n[hub-ui] redeploy failed: ${error?.data?.statusMessage ?? error?.message ?? 'unknown'}\n`
  } finally {
    redeploying.value = false
  }
}

onMounted(async () => {
  if (!isRealNumber(id.value)) {
    return
  }
  await loadDeployment()
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
    await loadDeployment()
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

.p-deploy {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
}

/* --- Header card --- */

.p-deploy-header {
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

.p-deploy-header.has-status-success,
.p-deploy-header.has-status-failed,
.p-deploy-header.has-status-running {
  border-left-width: 3px;
}

.p-deploy-header.has-status-success {
  border-left-color: hsl(var(--p-green));
}

.p-deploy-header.has-status-failed {
  border-left-color: hsl(var(--pui-destructive));
}

.p-deploy-header.has-status-running {
  border-left-color: hsl(var(--p-orange));
}

.p-deploy-icon {
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

.p-deploy-icon.is-cloudflare {
  color: hsl(28 100% 50%);
}

.p-deploy-headline {
  display: flex;
  flex-direction: column;
  gap: 0.21875rem;
  min-width: 0;
}

.p-deploy-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.p-deploy-eyebrow-sep {
  opacity: 0.6;
}

.p-deploy-back {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: inherit;
  text-decoration: none;
}

.p-deploy-back:hover {
  color: hsl(var(--pui-foreground));
}

.p-deploy-title {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.p-deploy-link {
  color: hsl(var(--pui-foreground));
  text-decoration: none;
}

.p-deploy-arrow {
  font-weight: 400;
}

.p-deploy-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.p-deploy-status {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.p-deploy-status.is-success {
  color: hsl(var(--p-green));
}

.p-deploy-status.is-failed {
  color: hsl(var(--pui-destructive));
}

.p-deploy-status.is-running {
  color: hsl(var(--p-orange));
}

.p-deploy-status :deep(svg) {
  font-size: 0.875em;
}

.p-deploy-status.is-running :deep(svg) {
  animation: p-deploy-spin 1s linear infinite;
}

@keyframes p-deploy-spin {
  to {
    transform: rotate(360deg);
  }
}

/* --- Meta line --- */

.p-deploy-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem 0.875rem;
  padding: 0 0.125rem;
  font-size: 0.8125rem;
}

.p-deploy-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
  max-width: 100%;
}

.p-deploy-meta-item :deep(svg) {
  flex-shrink: 0;
  font-size: 0.95em;
  opacity: 0.7;
}

.p-deploy-meta-item code {
  padding: 0.0625rem 0.3125rem;
  border-radius: calc(var(--pui-radius) - 0.25rem);
  background-color: hsl(var(--pui-muted) / 0.6);
  color: hsl(var(--pui-foreground));
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.75rem;
}

/* --- Error banner --- */

.p-deploy-error {
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

.p-deploy-log-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  overflow: hidden;
}

.p-deploy-log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.p-deploy-log-header h2 {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: hsl(var(--pui-muted-foreground));
}

.p-deploy-log-live {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  color: hsl(0 70% 45%);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.p-deploy-pulse {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  background-color: hsl(0 70% 50%);
  animation: p-deploy-pulse 1.4s ease-in-out infinite;
}

@keyframes p-deploy-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

.p-deploy-log {
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
  .p-deploy-header {
    grid-template-columns: auto 1fr;
    grid-template-areas:
      'icon headline'
      'actions actions';
    row-gap: 0.75rem;
    padding-right: 0.75rem;
  }
  .p-deploy-header > .p-deploy-icon {
    grid-area: icon;
  }
  .p-deploy-header > .p-deploy-headline {
    grid-area: headline;
  }
  .p-deploy-header > .p-deploy-actions {
    grid-area: actions;
    justify-content: flex-end;
  }
  .p-deploy-actions :deep(.pui-button) {
    --pui-size: -2 !important;
  }
}
</style>
