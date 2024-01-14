<template>
  <Teleport to="body">
    <div
      ref="wrapperEl"
      class="wrapper scrollbar-thin scrollbar-inverse fixed inset-0 flex transition"
      :class="{
        'invisible opacity-0': !visible,
        'overflow-y-auto bg-gray-900/50 p-8': width !== '100%',
        'z-40': order === 0,
        'z-41': order === 1,
        'z-42': order === 2,
      }"
    >
      <div
        class="relative m-auto w-full rounded-md bg-white shadow-sm transition"
        :class="{
          'h-full': width === '100%',
          'translate-y-4': !visible && width !== '100%',
          'opacity-0': !visible,
        }"
        :style="{ maxWidth: width }"
      >
        <div
          v-if="showHeader"
          class="sticky -top-8 z-20 flex items-center justify-between rounded-t-md border-b bg-white/75 backdrop-blur backdrop-filter"
        >
          <div
            class="flex flex-1 items-center gap-4 overflow-hidden"
            :class="{
              'h-11 px-4': size === 'small',
              'h-14 px-8': size === 'large',
            }"
          >
            <slot name="header">
              <h2 class="truncate text-sm">{{ title }}</h2>
            </slot>
          </div>

          <button
            :title="__('pruvious-dashboard', 'Close')"
            @click="$emit('update:visible', false)"
            data-ignore-autofocus
            type="button"
            class="flex shrink-0 border-l transition hocus:text-primary-700"
            :class="{
              'h-11 w-11': size === 'small',
              'h-14 w-14': size === 'large',
            }"
          >
            <PruviousIconX class="m-auto h-4 w-4" />
          </button>
        </div>
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { nextTick, ref, watch, type PropType } from '#imports'
import { useEventListener } from '@vueuse/core'
import { useFocusTrap } from '@vueuse/integrations/useFocusTrap'
import { getHotkeyAction, type HotkeyAction } from '../../composables/dashboard/hotkeys'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'

const props = defineProps({
  visible: Boolean,
  title: String,
  width: {
    type: String,
    default: '64rem',
  },
  size: {
    type: String as PropType<'small' | 'large'>,
    default: 'small',
  },
  showHeader: {
    type: Boolean,
    default: true,
  },
  order: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits<{
  'update:visible': [boolean]
  'hotkey': [HotkeyAction]
}>()

const wrapperEl = ref<HTMLDivElement>()

const { activate, deactivate } = useFocusTrap(wrapperEl, {
  escapeDeactivates: false,
  initialFocus: false,
  returnFocusOnDeactivate: false,
})

let removeWindowKeydownListener: (() => void) | undefined

await loadTranslatableStrings('pruvious-dashboard')

watch(
  () => props.visible,
  (value) => {
    nextTick(() => {
      if (value) {
        activate()

        removeWindowKeydownListener = useEventListener(document, 'keydown', (event) => {
          const action = getHotkeyAction(event)

          if (action) {
            event.preventDefault()
            event.stopPropagation()
            emit('hotkey', action)
          }
        })

        const focusable = wrapperEl.value?.querySelector(
          'button:not([data-ignore-autofocus]), a:not([data-ignore-autofocus]), input:not([data-ignore-autofocus]), select:not([data-ignore-autofocus])',
        ) as HTMLElement | null

        focusable?.focus()
      } else {
        deactivate()
        removeWindowKeydownListener?.()
      }
    })
  },
  { immediate: true },
)
</script>

<style scoped>
.wrapper.invisible {
  transition-property: all;
}
</style>
