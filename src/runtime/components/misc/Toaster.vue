<template>
  <div
    class="pointer-events-none fixed inset-0 z-toaster flex flex-col items-end justify-end gap-2.5 p-4 ph:flex-col-reverse"
  >
    <button
      v-for="ai of activeItems"
      :key="ai.id"
      :title="__('pruvious-dashboard', 'Click to dismiss')"
      @click="close(ai)"
      @mouseenter="pause(ai)"
      @mouseleave="resume(ai)"
      typeof="button"
      class="max-w-xs break-words rounded-md p-4 text-left text-sm text-white shadow-md transition-all"
      :class="{
        'pointer-events-auto': ai.visible,
        'invisible translate-x-full opacity-0': !ai.visible,
        'bg-emerald-700': ai.item.type === 'success',
        'bg-primary-700': ai.item.type === 'info',
        'bg-red-500': ai.item.type === 'error',
      }"
    >
      <div v-html="ai.item.message" class="content"></div>
    </button>
  </div>
</template>

<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref, watch } from '#imports'
import { useEventListener } from '@vueuse/core'
import { pruviousToasterShow, usePruviousToaster, type ToasterItem } from '../../composables/dashboard/toaster'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { isString } from '../../utils/string'

interface ActiveItem {
  item: Required<Omit<ToasterItem, 'afterRouteChange'>>
  id: number
  visible: boolean
  timeout?: NodeJS.Timeout
}

await loadTranslatableStrings('pruvious-dashboard')

const toaster = usePruviousToaster()
const activeItems = ref<ActiveItem[]>([])

let id = 0

watch(toaster, () => onChange())

onMounted(() => onChange(true))

useEventListener('pruvious-fetch-error' as any, (event: CustomEvent) => {
  if (isString(event.detail)) {
    pruviousToasterShow({ message: event.detail, type: 'error' })
  }
})

function onChange(initial = false) {
  if (toaster.value && (initial || !toaster.value.afterRouteChange)) {
    const activeItem: ActiveItem = {
      item: toaster.value,
      id: ++id,
      visible: false,
    }

    activeItem.timeout = setTimeout(() => {
      const i = activeItems.value.indexOf(activeItem)
      activeItems.value[i].visible = true
      resume(activeItem)
    }, 25)

    activeItems.value.push(activeItem)
    toaster.value = null
  }
}

function pause(item: ActiveItem) {
  clearTimeout(item.timeout)
}

function resume(item: ActiveItem) {
  item.timeout = setTimeout(() => {
    const i = activeItems.value.indexOf(item)
    activeItems.value[i].visible = false

    item.timeout = setTimeout(() => {
      activeItems.value.splice(activeItems.value.indexOf(item), 1)
    }, 150)
  }, 5000)
}

function close(item: ActiveItem) {
  clearTimeout(item.timeout)
  activeItems.value.splice(activeItems.value.indexOf(item), 1)
}

onBeforeUnmount(() => {
  for (const { timeout } of activeItems.value) {
    clearTimeout(timeout)
  }
})
</script>

<style scoped>
.content :deep() ul li:not(:last-child) {
  margin-bottom: 0.375rem;
}
</style>
