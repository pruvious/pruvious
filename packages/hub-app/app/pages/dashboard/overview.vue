<template>
  <PruviousDashboardPage>
    <div class="p-overview">
      <section class="p-overview-section">
        <header class="p-overview-section-head">
          <h2>{{ __('pruvious-dashboard', 'Targets') }}</h2>
        </header>

        <div v-if="loadingTargets" class="p-overview-loading">{{ __('pruvious-dashboard', 'Loading') }}…</div>

        <div v-else-if="loadError" class="p-overview-error">{{ loadError }}</div>

        <div v-else-if="!targets.length" class="p-overview-empty">
          <Icon mode="svg" name="tabler:rocket" />
          <p>{{ __('pruvious-dashboard', 'No deployment targets yet') }}</p>
        </div>

        <ul v-else class="p-overview-targets">
          <li
            v-for="target in targets"
            :key="target.id"
            :class="[
              'p-overview-target-row',
              target.lastDeploymentStatus ? `has-status-${target.lastDeploymentStatus}` : '',
            ]"
          >
            <div :class="['p-overview-target-icon', `is-${target.type}`]">
              <Icon :name="providerIcon(target.type)" mode="svg" />
            </div>

            <div class="p-overview-target-main">
              <div class="p-overview-target-name pui-medium">
                <NuxtLink
                  v-if="target.project?.id"
                  :to="`${dashboardBasePath}collections/projects/${target.project.id}`"
                  class="p-overview-target-link pui-truncate"
                >
                  {{ target.project.name }}
                </NuxtLink>
                <span class="p-overview-arrow pui-muted">/</span>
                <NuxtLink
                  :to="`${dashboardBasePath}collections/deployment-targets/${target.id}`"
                  class="p-overview-target-link pui-truncate"
                >
                  {{ target.name }}
                </NuxtLink>
              </div>
              <div class="p-overview-target-meta pui-muted">
                <span class="p-overview-target-type-text">{{ target.type }}</span>
                <template v-if="targetUrl(target.name)">
                  <span class="p-overview-dot">·</span>
                  <a
                    :href="targetUrl(target.name)!"
                    @click.stop
                    rel="noopener"
                    target="_blank"
                    class="p-overview-target-domain"
                  >
                    <span class="pui-truncate">{{ target.name }}</span>
                    <Icon mode="svg" name="tabler:external-link" class="pui-shrink-0" />
                  </a>
                </template>
                <template v-if="target.lastDeploymentAt">
                  <span class="p-overview-dot">·</span>
                  <span
                    v-pui-tooltip.nomd="{ content: dayjsFormatDateTime(target.lastDeploymentAt), offset: [0, 7] }"
                    class="p-overview-target-since"
                  >
                    <Icon
                      v-if="target.lastDeploymentStatus"
                      :name="statusIcon(target.lastDeploymentStatus)"
                      mode="svg"
                      :class="`is-${target.lastDeploymentStatus}`"
                    />
                    {{ dayjsRelative(target.lastDeploymentAt) }}
                  </span>
                </template>
              </div>
            </div>

            <div class="p-overview-target-side">
              <PUIButton
                :disabled="deploying[target.id] || target.lastDeploymentStatus === 'running'"
                :size="-1"
                @click="deploy(target.id)"
                type="button"
              >
                <Icon mode="svg" name="tabler:cloud-upload" />
                <span>
                  {{
                    target.lastDeploymentStatus === 'running'
                      ? __('pruvious-dashboard', 'Running')
                      : deploying[target.id]
                        ? __('pruvious-dashboard', 'Queued')
                        : __('pruvious-dashboard', 'Deploy')
                  }}
                </span>
              </PUIButton>
            </div>
          </li>
        </ul>
      </section>

      <section class="p-overview-section">
        <header class="p-overview-section-head">
          <h2>{{ __('pruvious-dashboard', 'Recent deployments') }}</h2>
        </header>

        <div v-if="loadingDeployments" class="p-overview-loading">{{ __('pruvious-dashboard', 'Loading') }}…</div>

        <div v-else-if="!recentDeployments.length" class="p-overview-empty">
          <Icon mode="svg" name="tabler:history" />
          <p>{{ __('pruvious-dashboard', 'No deployments yet') }}</p>
        </div>

        <ul v-else class="p-overview-deploys">
          <li v-for="d in recentDeployments" :key="d.id">
            <NuxtLink
              :to="`${dashboardBasePath}collections/deployments/${d.id}`"
              :class="['p-overview-deploy-row', d.status ? `has-status-${d.status}` : '']"
            >
              <div class="p-overview-deploy-main">
                <div class="p-overview-deploy-title">
                  <span v-if="d.project?.name" class="pui-truncate pui-medium">{{ d.project.name }}</span>
                  <span v-if="d.target" class="p-overview-arrow pui-muted">/</span>
                  <span v-if="d.target" class="pui-truncate pui-medium">{{ d.target.name }}</span>
                  <span class="p-overview-deploy-id pui-muted">#{{ d.id }}</span>
                </div>
                <div class="p-overview-deploy-meta pui-muted">
                  <span v-if="d.target" class="p-overview-target-type-text">{{ d.target.type }}</span>
                  <span v-if="d.target" class="p-overview-dot">·</span>
                  <span
                    v-pui-tooltip.nomd="{ content: dayjsFormatDateTime(d.createdAt), offset: [0, 7] }"
                    class="p-overview-target-since"
                  >
                    <Icon :name="statusIcon(d.status)" mode="svg" :class="`is-${d.status}`" />
                    {{ dayjsRelative(d.createdAt) }}
                  </span>
                  <template v-if="d.triggeredBy">
                    <span class="p-overview-dot">·</span>
                    <span class="p-overview-deploy-by pui-truncate">{{ d.triggeredBy }}</span>
                  </template>
                </div>
              </div>

              <div :class="['p-overview-target-icon', d.target ? `is-${d.target.type}` : '']">
                <Icon :name="d.target ? providerIcon(d.target.type) : 'tabler:rocket'" mode="svg" />
              </div>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </div>
  </PruviousDashboardPage>
</template>

<script lang="ts" setup>
import { __ } from '#pruvious/app'
import { $pfetchDashboard, dashboardBasePath, dashboardMiddleware, defineDashboardPage } from '#pruvious/dashboard'
import { dayjsFormatDateTime, dayjsRelative } from '#pruvious/dashboard/dayjs'
import { puiTooltipInit } from '@pruvious/ui/pui/tooltip'

defineDashboardPage({
  label: ({ __ }) => __('pruvious-dashboard', 'Overview'),
  icon: 'dashboard',
  group: 'general',
  order: 1,
})

definePageMeta({
  path: dashboardBasePath + 'overview',
  middleware: [(to) => dashboardMiddleware(to, 'default'), (to) => dashboardMiddleware(to, 'auth-guard')],
})

useHead({
  title: __('pruvious-dashboard', 'Overview'),
})

puiTooltipInit()

interface TargetRow {
  id: number
  name: string
  type: string
  project: { id: number; name: string }
  branch: string | null
  lastDeploymentAt: number | null
  lastDeploymentStatus: string | null
}

interface DeploymentRow {
  id: number
  status: string
  branch: string | null
  commit: string | null
  startedAt: number | null
  finishedAt: number | null
  createdAt: number
  target: { id: number; name: string; type: string } | null
  project: { id: number; name: string | null } | null
  triggeredBy: string | null
}

const targets = ref<TargetRow[]>([])
const recentDeployments = ref<DeploymentRow[]>([])
const loadingTargets = ref(true)
const loadingDeployments = ref(true)
const loadError = ref<string | null>(null)
const deploying = reactive<Record<number, boolean>>({})
const pollTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const POLL_INTERVAL_MS = 3000

function statusIcon(status: string): string {
  switch (status) {
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

function targetUrl(name: string): string | null {
  if (!name) {
    return null
  }
  const trimmed = name.trim()
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      return new URL(trimmed).toString()
    } catch {
      return null
    }
  }
  if (/^[a-z0-9][a-z0-9-]*(\.[a-z0-9][a-z0-9-]*)*\.[a-z]{2,}$/i.test(trimmed)) {
    return `https://${trimmed}`
  }
  return null
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

async function loadTargets(silent = false) {
  if (!silent) {
    loadingTargets.value = true
    loadError.value = null
  }
  try {
    const { targets: rows } = (await $pfetchDashboard('/api/hub/targets')) as { targets: TargetRow[] }
    targets.value = rows
  } catch (error: any) {
    loadError.value = error?.data?.statusMessage ?? error?.message ?? __('pruvious-dashboard', 'Failed to load targets')
  } finally {
    loadingTargets.value = false
  }
}

async function loadRecentDeployments(silent = false) {
  if (!silent) {
    loadingDeployments.value = true
  }
  try {
    const { deployments } = (await $pfetchDashboard('/api/hub/recent-deployments?limit=10')) as {
      deployments: DeploymentRow[]
    }
    recentDeployments.value = deployments
  } catch {
    // tolerated - just leaves the section empty
  } finally {
    loadingDeployments.value = false
  }
}

function hasActiveDeployment(): boolean {
  return (
    targets.value.some((t) => t.lastDeploymentStatus === 'running') ||
    recentDeployments.value.some((d) => d.status === 'running' || d.status === 'queued')
  )
}

function stopPolling() {
  if (pollTimer.value) {
    clearTimeout(pollTimer.value)
    pollTimer.value = null
  }
}

function schedulePoll() {
  stopPolling()
  if (!hasActiveDeployment()) {
    return
  }
  pollTimer.value = setTimeout(async () => {
    await Promise.all([loadTargets(true), loadRecentDeployments(true)])
    schedulePoll()
  }, POLL_INTERVAL_MS)
}

async function deploy(targetId: number) {
  deploying[targetId] = true
  try {
    const { deploymentId } = (await $pfetchDashboard(`/api/hub/targets/${targetId}/deploy`, {
      method: 'POST',
    })) as { deploymentId: number }
    await navigateTo(`${dashboardBasePath}collections/deployments/${deploymentId}`)
  } catch (error: any) {
    loadError.value = error?.data?.statusMessage ?? error?.message ?? __('pruvious-dashboard', 'Deploy failed')
  } finally {
    deploying[targetId] = false
  }
}

onMounted(async () => {
  await Promise.all([loadTargets(), loadRecentDeployments()])
  schedulePoll()
})

onBeforeUnmount(() => {
  stopPolling()
})
</script>

<style scoped>
.p-overview {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.p-overview-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.p-overview-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0 0.125rem;
}

.p-overview-section-head h2 {
  margin: 0;
  color: hsl(var(--pui-muted-foreground));
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.p-overview-loading {
  padding: 1.5rem 0;
  text-align: center;
  color: hsl(var(--pui-muted-foreground));
  font-size: 0.8125rem;
}

.p-overview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem 0.75rem;
  border-width: 1px;
  border-style: dashed;
  border-radius: var(--pui-radius);
  color: hsl(var(--pui-muted-foreground));
  font-size: 0.875rem;
  text-align: center;
}

.p-overview-empty svg {
  font-size: 1.75rem;
  opacity: 0.5;
}

.p-overview-error {
  padding: 0.75rem 1rem;
  border-width: 1px;
  border-color: hsl(var(--pui-destructive));
  border-radius: var(--pui-radius);
  background-color: hsl(var(--pui-destructive) / 0.1);
  color: hsl(var(--pui-destructive));
  font-size: 0.875rem;
}

.p-overview-arrow {
  flex-shrink: 0;
  margin: 0 0.125rem;
}

/* --- Recent deployments list --- */

.p-overview-deploys {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.p-overview-deploy-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.875rem;
  border-width: 1px;
  border-radius: var(--pui-radius);
  background-color: hsl(var(--pui-card));
  color: hsl(var(--pui-foreground));
  text-decoration: none;
}

.p-overview-deploy-row.has-status-success,
.p-overview-deploy-row.has-status-failed,
.p-overview-deploy-row.has-status-running {
  border-left-width: 3px;
}

.p-overview-deploy-row:hover {
  background-color: hsl(var(--pui-muted) / 0.5);
}

.p-overview-deploy-row.has-status-success {
  border-left-color: hsl(var(--p-green));
}

.p-overview-deploy-row.has-status-failed {
  border-left-color: hsl(var(--pui-destructive));
}

.p-overview-deploy-row.has-status-running {
  border-left-color: hsl(var(--p-orange));
}

.p-overview-deploy-main {
  display: flex;
  flex-direction: column;
  gap: 0.1875rem;
  min-width: 0;
}

.p-overview-deploy-title {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
  font-size: 0.875rem;
  color: hsl(var(--pui-foreground));
}

.p-overview-deploy-id {
  margin-left: 0.25rem;
  font-weight: 300;
}

.p-overview-deploy-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
}

.p-overview-deploy-by {
  max-width: 16rem;
}

@container (max-width: 480px) {
  .p-overview-deploy-by {
    display: none;
  }
}

/* --- Targets list --- */

.p-overview-targets {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.p-overview-target-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  padding-right: 1.125rem;
  border-width: 1px;
  border-radius: var(--pui-radius);
  background-color: hsl(var(--pui-card));
}

.p-overview-target-row.has-status-success,
.p-overview-target-row.has-status-failed,
.p-overview-target-row.has-status-running {
  border-left-width: 3px;
}

.p-overview-target-row.has-status-success {
  border-left-color: hsl(var(--p-green));
}

.p-overview-target-row.has-status-failed {
  border-left-color: hsl(var(--pui-destructive));
}

.p-overview-target-row.has-status-running {
  border-left-color: hsl(var(--p-orange));
}

.p-overview-target-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: var(--pui-radius);
  background-color: hsl(var(--pui-muted) / 0.6);
  color: hsl(var(--pui-foreground));
  font-size: 1.125rem;
}

.p-overview-target-icon.is-cloudflare {
  color: hsl(28 100% 50%);
}

.p-overview-target-main {
  display: flex;
  flex-direction: column;
  gap: 0.1875rem;
  min-width: 0;
}

.p-overview-target-name {
  display: flex;
  align-items: center;
  gap: 0.125rem;
  min-width: 0;
  font-size: 0.875rem;
}

.p-overview-target-link {
  color: hsl(var(--pui-foreground));
  text-decoration: none;
}

.p-overview-target-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
}

.p-overview-target-type-text {
  text-transform: lowercase;
}

.p-overview-target-domain {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
  color: inherit;
  text-decoration: none;
}

.p-overview-target-domain:hover {
  color: hsl(var(--pui-foreground));
}

.p-overview-target-since {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.p-overview-target-since :deep(svg) {
  font-size: 0.875em;
}

.p-overview-target-since :deep(svg.is-success) {
  color: hsl(var(--p-green));
}

.p-overview-target-since :deep(svg.is-failed) {
  color: hsl(var(--pui-destructive));
}

.p-overview-target-since :deep(svg.is-running) {
  color: hsl(var(--p-orange));
  animation: p-overview-spin 1s linear infinite;
}

@keyframes p-overview-spin {
  to {
    transform: rotate(360deg);
  }
}

.p-overview-target-side {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

/* On narrower containers, drop noisy meta then stack actions */
@container (max-width: 640px) {
  .p-overview-target-domain,
  .p-overview-dot {
    display: none;
  }
}

@container (max-width: 480px) {
  .p-overview-target-row {
    grid-template-columns: auto 1fr;
    grid-template-areas:
      'icon main'
      'side side';
    row-gap: 0.5rem;
    padding-right: 0.75rem;
  }
  .p-overview-target-row > .p-overview-target-icon {
    grid-area: icon;
  }
  .p-overview-target-row > .p-overview-target-main {
    grid-area: main;
  }
  .p-overview-target-row > .p-overview-target-side {
    grid-area: side;
    justify-content: flex-end;
  }
  .p-overview-target-side :deep(.pui-button) {
    --pui-size: -2 !important;
  }
}
</style>
