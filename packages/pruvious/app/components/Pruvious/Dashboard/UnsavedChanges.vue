<template>
  <PUIPopup v-if="isVisible" :size="-1" @close="$event().then(cancel)" @keydown="onKeyDown" ref="popup" width="26rem">
    <PUIProse>
      <p>{{ __('pruvious-dashboard', 'Changes that you made may not be saved.') }}</p>
    </PUIProse>

    <div class="pui-row">
      <PUIButton @click="popup?.close().then(cancel)" variant="outline">
        {{ __('pruvious-dashboard', 'Cancel') }}
      </PUIButton>

      <PUIButton @click="popup?.close().then(leave)" variant="primary">
        {{ __('pruvious-dashboard', 'OK') }}
      </PUIButton>
    </div>
  </PUIPopup>
</template>

<script lang="ts" setup>
import { __, getOverlayTransitionDuration, History, unsavedChanges } from '#pruvious/client'
import { puiIsEditingText, puiIsMac } from '@pruvious/ui/pui/hotkeys'
import { blurActiveElement, isDefined } from '@pruvious/utils'
import { useEventListener, watchOnce } from '@vueuse/core'
import { onBeforeRouteLeave, type NavigationGuardNext, type RouteLocationNormalized } from 'vue-router'

const popup = useTemplateRef('popup')
const isVisible = ref(false)
const destination = ref<RouteLocationNormalized>()
const leaveCount = ref(0)

let stop: (() => void) | undefined
let prevHistory: History | null = null

unsavedChanges.prompt = async () => {
  isVisible.value = true
  return new Promise<boolean>((resolve) => {
    watchOnce(leaveCount, (newValue, oldValue) => resolve(newValue > (oldValue ?? 0)))
  })
}

watch(isVisible, () => {
  if (isVisible.value) {
    stop = useEventListener(
      'keydown',
      (event) => {
        const mac = puiIsMac()
        const letter = event.key?.toLowerCase() ?? ''

        if (mac && (!event.metaKey || event.altKey || event.ctrlKey)) {
          return
        } else if (!mac && (!event.ctrlKey || event.altKey || event.metaKey)) {
          return
        }

        if ((letter === 'y' && !event.shiftKey) || (letter === 'z' && (mac || !event.shiftKey))) {
          event.preventDefault()
        }
      },
      { capture: true },
    )
  } else {
    stop?.()
  }
})

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

function leaveGuard(to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) {
  const [shorterPath, longerPath] =
    to.fullPath.length > from.fullPath.length ? [from.fullPath, to.fullPath] : [to.fullPath, from.fullPath]

  if (longerPath.startsWith(shorterPath) && longerPath.slice(shorterPath.length).match(/^[\?&]edit=/)) {
    if (longerPath === to.fullPath) {
      prevHistory = unsavedChanges.history
    } else if (prevHistory) {
      unsavedChanges.history = prevHistory
      prevHistory = null
    }
    next()
  } else if (unsavedChanges.history?.isDirty.value) {
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

function onKeyDown(event: KeyboardEvent) {
  if (
    event.code === 'Enter' &&
    !(document.activeElement instanceof HTMLButtonElement) &&
    !event.metaKey &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.shiftKey
  ) {
    popup.value?.close().then(leave)
  }
}
</script>

<style scoped>
.pui-row {
  justify-content: flex-end;
  margin-top: 0.75rem;
}
</style>
