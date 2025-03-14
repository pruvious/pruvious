<template>
  <div class="pui-row">
    <PUIButton
      v-pui-tooltip.watch.row.nomd="
        `<span>${__('pruvious-dashboard', 'Undo')}</span><code>${history.undoCount.value}</code>`
      "
      :disabled="!history.canUndo.value"
      @click="undo()"
      variant="outline"
    >
      <Icon mode="svg" name="tabler:arrow-back-up" />
    </PUIButton>
    <PUIButton
      v-pui-tooltip.watch.row.nomd="
        `<span>${__('pruvious-dashboard', 'Redo')}</span><code>${history.redoCount.value}</code>`
      "
      :disabled="!history.canRedo.value"
      @click="redo()"
      variant="outline"
    >
      <Icon mode="svg" name="tabler:arrow-forward-up" />
    </PUIButton>
  </div>
</template>

<script generic="T extends Record<string, any>" lang="ts" setup>
import { __ } from '#pruvious/client'
import type { History } from '../../../utils/pruvious/dashboard/history'

const props = defineProps({
  /**
   * The data that is being edited.
   */
  modelValue: {
    type: Object as PropType<T>,
    required: true,
  },

  /**
   * The `History` class instance that manages the undo and redo functionality.
   */
  history: {
    type: Object as PropType<History<T>>,
    required: true,
  },
})

const emit = defineEmits<{
  'update:modelValue': [value: T]
}>()

const { listen, allowInOverlay } = usePUIHotkeys()

allowInOverlay.value = true
listen('undo', undo)
listen('redo', redo)

function undo(event?: Event) {
  event?.preventDefault()
  const state = props.history.undo()
  if (state) {
    emit('update:modelValue', state)
  }
}

function redo(event?: Event) {
  event?.preventDefault()
  const state = props.history.redo()
  if (state) {
    emit('update:modelValue', state)
  }
}
</script>
