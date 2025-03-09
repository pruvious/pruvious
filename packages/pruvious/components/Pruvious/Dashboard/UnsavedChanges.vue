<template>
  <PUIPopup v-if="isVisible" :size="-1" @close="$event().then(cancel)" ref="popup" width="26rem">
    <PUIProse>
      <p>{{ __('pruvious-dashboard', 'Changes that you made may not be saved.') }}</p>
    </PUIProse>
    <div class="pui-row">
      <PUIButton @click="cancel()" variant="outline">{{ __('pruvious-dashboard', 'Cancel') }}</PUIButton>
      <PUIButton @click="leave()" variant="primary">{{ __('pruvious-dashboard', 'OK') }}</PUIButton>
    </div>
  </PUIPopup>
</template>

<script lang="ts" setup>
import { __, getOverlayTransitionDuration, unsavedChanges } from '#pruvious/client'
import { blurActiveElement, isDefined } from '@pruvious/utils'
import { useEventListener, watchOnce } from '@vueuse/core'
import { onBeforeRouteLeave, type NavigationGuardNext, type RouteLocationNormalized } from 'vue-router'

const isVisible = ref(false)
const destination = ref<RouteLocationNormalized>()
const leaveCount = ref(0)

unsavedChanges.prompt = async () => {
  isVisible.value = true
  return new Promise<boolean>((resolve) => {
    watchOnce(leaveCount, (newValue, oldValue) => resolve(newValue > oldValue))
  })
}

onBeforeRouteLeave(leaveGuard)
onBeforeRouteUpdate(leaveGuard)

useEventListener(window, 'beforeunload', async (event) => {
  if (puiIsEditingText()) {
    blurActiveElement()
  }
  if (unsavedChanges.history?.isDirty.value) {
    event.preventDefault()
    event.returnValue = ''
  }
})

function leaveGuard(to: RouteLocationNormalized, _from: RouteLocationNormalized, next: NavigationGuardNext) {
  if (unsavedChanges.history?.isDirty.value) {
    isVisible.value = true
    destination.value = to
    next(false)
  } else {
    unsavedChanges.history = null
    next()
  }
}

function cancel() {
  isVisible.value = false
  destination.value = undefined
  leaveCount.value--
}

function leave() {
  isVisible.value = false
  unsavedChanges.history = null
  if (isDefined(destination.value)) {
    const to = destination.value
    setTimeout(() => navigateTo(to), getOverlayTransitionDuration())
  }
  destination.value = undefined
  leaveCount.value++
}
</script>

<style scoped>
.pui-row {
  justify-content: flex-end;
  margin-top: 0.75rem;
}
</style>
