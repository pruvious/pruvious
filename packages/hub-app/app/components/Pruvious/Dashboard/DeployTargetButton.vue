<template>
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

const busy = ref(false)
const currentStatus = ref<string | null>(props.data?.lastDeploymentStatus ?? null)
const pollTimer = ref<ReturnType<typeof setTimeout> | null>(null)

const isRunning = computed(() => currentStatus.value === 'running')

async function refreshStatus() {
  try {
    const res = (await $pfetchDashboard(`/api/hub/targets/${props.id}/status`)) as {
      lastDeploymentStatus: string | null
    }
    currentStatus.value = res.lastDeploymentStatus
  } catch {
    // tolerated - keep previous value
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
