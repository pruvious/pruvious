<template>
  <PruviousPopup v-model:visible="visible" :showHeader="false" @hotkey="onHotkey" width="26rem">
    <div class="flex flex-col gap-4 p-4">
      <p v-html="current?.message" class="text-15"></p>

      <div class="flex justify-end gap-2">
        <button @click="reject()" type="button" class="button button-white">
          <span>{{ current?.rejectLabel }}</span>
        </button>

        <button @click="resolve()" type="button" class="button">
          <span>{{ current?.resolveLabel }}</span>
        </button>
      </div>
    </div>
  </PruviousPopup>
</template>

<script lang="ts" setup>
import { ref, watch } from '#imports'
import { dashboardMiscComponent } from '#pruvious/dashboard'
import { usePruviousDialog, type PruviousDialog } from '../../composables/dashboard/dialog'
import type { HotkeyAction } from '../../composables/dashboard/hotkeys'
import { loadTranslatableStrings } from '../../composables/translatable-strings'

const dialog = usePruviousDialog()

const current = ref<PruviousDialog | null>(null)
const visible = ref(false)

const PruviousPopup = dashboardMiscComponent.Popup()

await loadTranslatableStrings('pruvious-dashboard')

watch(
  dialog,
  () => {
    if (dialog.value) {
      current.value = dialog.value
    }

    visible.value = !!dialog.value
  },
  { immediate: true },
)

function reject() {
  dialog.value = null
  dispatchEvent(new CustomEvent('pruvious-dialog', { detail: false }))
}

function resolve() {
  dialog.value = null
  dispatchEvent(new CustomEvent('pruvious-dialog', { detail: true }))
}

function onHotkey(action: HotkeyAction) {
  if (action === 'close') {
    reject()
  }
}
</script>
