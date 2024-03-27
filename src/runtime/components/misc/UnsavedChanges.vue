<template>
  <PruviousPopup v-model:visible="popupVisible" :order="2" :showHeader="false" @hotkey="onHotkey" width="26rem">
    <div class="flex flex-col gap-4 p-4">
      <p class="text-15">
        {{ __('pruvious-dashboard', 'Changes that you made may not be saved.') }}
      </p>

      <div class="flex justify-end gap-2">
        <button @click="cancel()" type="button" class="button button-white">
          <span>{{ __('pruvious-dashboard', 'Cancel') }}</span>
        </button>

        <button @click="leave()" type="button" class="button">
          <span>{{ __('pruvious-dashboard', 'Leave') }}</span>
        </button>
      </div>
    </div>
  </PruviousPopup>
</template>

<script lang="ts" setup>
import { navigateTo, onBeforeRouteUpdate, ref } from '#imports'
import { dashboardMiscComponent } from '#pruvious/dashboard'
import { onBeforeRouteLeave, type NavigationGuardNext, type RouteLocationNormalized } from '#vue-router'
import { useEventListener } from '@vueuse/core'
import type { HotkeyAction } from '../../composables/dashboard/hotkeys'
import { useUnsavedChanges } from '../../composables/dashboard/unsaved-changes'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'

const unsavedChanges = useUnsavedChanges()

const popupVisible = ref(false)
const destination = ref<RouteLocationNormalized>()

const PruviousPopup = dashboardMiscComponent.Popup()

await loadTranslatableStrings('pruvious-dashboard')

onBeforeRouteLeave(leaveGuard)
onBeforeRouteUpdate(leaveGuard)

useEventListener(window, 'beforeunload', async (event) => {
  if (unsavedChanges.value?.isDirty) {
    event.preventDefault()
    event.returnValue = ''
  }
})

function leaveGuard(to: RouteLocationNormalized, _from: RouteLocationNormalized, next: NavigationGuardNext) {
  if (unsavedChanges.value?.isDirty) {
    popupVisible.value = true
    destination.value = to
    next(false)
  } else {
    unsavedChanges.value = null
    next()
  }
}

function cancel() {
  popupVisible.value = false
  destination.value = undefined
}

function leave() {
  popupVisible.value = false
  unsavedChanges.value = null
  navigateTo(destination.value)
  destination.value = undefined
}

function onHotkey(action: HotkeyAction) {
  if (action === 'close') {
    cancel()
  }
}
</script>
