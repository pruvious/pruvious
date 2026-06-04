<template>
  <div class="flex items-center gap-2">
    <PUIButton
      v-if="showReleaseLock"
      v-pui-tooltip="
        __(
          'pruvious-dashboard',
          'A previous deployment left a stale sync lock on this target. Click to release it before the TTL expires.',
        )
      "
      :disabled="busy"
      @click="releaseLock()"
      icon
      variant="outline"
    >
      <Icon mode="svg" name="tabler:lock-open" />
    </PUIButton>
    <PUIButton
      v-pui-tooltip="
        isRunning
          ? __('pruvious-dashboard', 'A deployment is already queued or running for this target')
          : __('pruvious-dashboard', 'Trigger a new deployment for this target')
      "
      :disabled="busy || isRunning"
      @click="deploy()"
      icon
      variant="outline"
    >
      <Icon mode="svg" name="tabler:cloud-upload" />
    </PUIButton>
  </div>
</template>

<script lang="ts" setup>
import { __ } from '#pruvious/app'
import { $pfetchDashboard, dashboardBasePath } from '#pruvious/dashboard'

const props = defineProps({
  id: {
    type: Number,
    required: true,
  },
  /**
   * Initial `lastDeploymentStatus` snapshot - the component then polls for live updates.
   */
  data: {
    type: Object as PropType<{ lastDeploymentStatus?: string | null } | null>,
    default: null,
  },
})

const POLL_INTERVAL_MS = 3000

interface SyncLockSnapshot {
  deploymentId: number
  acquiredAt: number
  expiresAt: number
  ownerStatus: string | null
}

const busy = ref(false)
const currentStatus = ref<string | null>(props.data?.lastDeploymentStatus ?? null)
const syncLock = ref<SyncLockSnapshot | null>(null)
const pollTimer = ref<ReturnType<typeof setTimeout> | null>(null)

const isRunning = computed(() => currentStatus.value === 'running')

const showReleaseLock = computed(() => {
  const lock = syncLock.value
  if (!lock) {
    return false
  }
  if (lock.expiresAt <= Date.now()) {
    return false
  }
  return lock.ownerStatus === 'success' || lock.ownerStatus === 'failed'
})

async function refreshStatus() {
  try {
    const res = (await $pfetchDashboard(`/api/hub/targets/${props.id}/status`)) as {
      lastDeploymentStatus: string | null
      syncLock: SyncLockSnapshot | null
    }
    currentStatus.value = res.lastDeploymentStatus
    syncLock.value = res.syncLock
  } catch {
    // tolerated - keep previous value
  }
}

async function releaseLock() {
  busy.value = true
  try {
    await $pfetchDashboard(`/api/hub/targets/${props.id}/release-lock`, { method: 'POST' })
    await refreshStatus()
  } catch {
  } finally {
    busy.value = false
  }
}

function stopPolling() {
  if (pollTimer.value) {
    clearTimeout(pollTimer.value)
    pollTimer.value = null
  }
}

function schedulePoll() {
  stopPolling()
  pollTimer.value = setTimeout(async () => {
    await refreshStatus()
    schedulePoll()
  }, POLL_INTERVAL_MS)
}

async function deploy() {
  busy.value = true
  try {
    const { deploymentId } = (await $pfetchDashboard(`/api/hub/targets/${props.id}/deploy`, {
      method: 'POST',
    })) as { deploymentId: number }
    await navigateTo(`${dashboardBasePath}collections/deployments/${deploymentId}`)
  } catch {
  } finally {
    busy.value = false
  }
}

onMounted(async () => {
  await refreshStatus()
  schedulePoll()
})

onBeforeUnmount(() => {
  stopPolling()
})
</script>
