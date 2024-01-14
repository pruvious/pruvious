<template>
  <div class="flex gap-2">
    <button
      v-pruvious-tooltip="{
        content: history.undosRemaining.value
          ? __('pruvious-dashboard', 'Undo (($count))', { count: history.undosRemaining.value })
          : undefined,
        showOnCreate: undoButtonFocused,
      }"
      :disabled="!history.undosRemaining.value"
      @blur="undoButtonFocused = false"
      @click="$emit('undo')"
      @focus="undoButtonFocused = true"
      ref="undoButton"
      type="button"
      class="button button-white button-square"
    >
      <PruviousIconArrowBackUp />
    </button>

    <button
      v-pruvious-tooltip="{
        content: history.redosRemaining.value
          ? __('pruvious-dashboard', 'Redo (($count))', { count: history.redosRemaining.value })
          : undefined,
        showOnCreate: redoButtonFocused,
      }"
      :disabled="!history.redosRemaining.value"
      @blur="redoButtonFocused = false"
      @click="$emit('redo')"
      @focus="redoButtonFocused = true"
      ref="redoButton"
      type="button"
      class="button button-white button-square"
    >
      <PruviousIconArrowForwardUp />
    </button>
  </div>
</template>

<script lang="ts" setup>
import { ref, type PropType } from '#imports'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import type { History } from '../../utils/dashboard/history'

defineProps({
  history: {
    type: Object as PropType<History>,
    required: true,
  },
})

defineEmits<{
  undo: []
  redo: []
}>()

const undoButton = ref<HTMLButtonElement>()
const redoButton = ref<HTMLButtonElement>()
const undoButtonFocused = ref(false)
const redoButtonFocused = ref(false)

await loadTranslatableStrings('pruvious-dashboard')
</script>
