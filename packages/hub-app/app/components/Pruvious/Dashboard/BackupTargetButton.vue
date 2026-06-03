<template>
  <PUIButton
    v-pui-tooltip="__('pruvious-dashboard', 'Trigger a new backup for this target')"
    :disabled="busy"
    :variant="open ? 'primary' : 'outline'"
    @click="open = true"
    icon
    ref="triggerButton"
  >
    <Icon mode="svg" name="tabler:database-export" />
  </PUIButton>
  <PUIDropdown
    v-if="open"
    :reference="triggerButton?.$el"
    :restoreFocus="false"
    @click="open = false"
    @close="open = false"
  >
    <PUIDropdownItem :title="__('pruvious-dashboard', 'Database')" @click="backup('db')">
      <Icon mode="svg" name="tabler:database" />
      <span>{{ __('pruvious-dashboard', 'Database') }}</span>
    </PUIDropdownItem>
    <PUIDropdownItem :title="__('pruvious-dashboard', 'Uploads')" @click="backup('uploads')">
      <Icon mode="svg" name="tabler:files" />
      <span>{{ __('pruvious-dashboard', 'Uploads') }}</span>
    </PUIDropdownItem>
    <PUIDropdownItem :title="__('pruvious-dashboard', 'Full')" @click="backup('full')">
      <Icon mode="svg" name="tabler:package-export" />
      <span>{{ __('pruvious-dashboard', 'Full') }}</span>
    </PUIDropdownItem>
  </PUIDropdown>
</template>

<script lang="ts" setup>
import { __ } from '#pruvious/app'
import { $pfetchDashboard, dashboardBasePath } from '#pruvious/dashboard'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  id: {
    type: Number,
    required: true,
  },
})

const busy = ref(false)
const open = ref(false)
const triggerButton = ref<{ $el: HTMLElement } | null>(null)

async function backup(type: 'db' | 'uploads' | 'full') {
  open.value = false
  busy.value = true
  try {
    const { backupId } = (await $pfetchDashboard(`/api/hub/targets/${props.id}/backup`, {
      method: 'POST',
      body: { type },
    })) as { backupId: number }
    await navigateTo(`${dashboardBasePath}collections/backups/${backupId}`)
  } catch {
  } finally {
    busy.value = false
  }
}
</script>
