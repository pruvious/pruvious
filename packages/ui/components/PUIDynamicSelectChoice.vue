<template>
  <button
    @click.prevent="
      () => {
        if (!choice.disabled) {
          $emit('select', choice)
          $emit('close')
        }
      }
    "
    @mouseenter="
      () => {
        if (!mousePaused && !choice.disabled) {
          $emit('update:highlightedChoice', choice)
        }
      }
    "
    @mouseleave="
      () => {
        if (!mousePaused && !choice.disabled) {
          $emit('update:highlightedChoice', undefined)
        }
      }
    "
    @mousemove="
      () => {
        if (choice.value !== highlightedChoice?.value && !choice.disabled) {
          $emit('update:highlightedChoice', choice)
        }

        if (mousePaused) {
          $emit('update:mousePaused', false)
        }
      }
    "
    type="button"
    class="pui-dynamic-select-choice pui-raw"
    :class="{
      'pui-dynamic-select-choice-selected': choice.value === selectedValue,
      'pui-dynamic-select-choice-highlighted': choice.value === highlightedChoice?.value,
      'pui-dynamic-select-choice-disabled': choice.disabled,
      'pui-dynamic-select-choice-detailed': choice.detail !== undefined,
    }"
  >
    <span :title="choice.label ?? String(choice.value)" class="pui-dynamic-select-choice-content">
      <span class="pui-dynamic-select-choice-label">{{ (choice.label ?? choice.value) || '-' }}</span>
      <span v-if="choice.detail !== undefined" class="pui-dynamic-select-choice-detail">
        {{ choice.detail || '-' }}
      </span>
    </span>
    <Icon
      v-if="choice.value === selectedValue"
      mode="svg"
      name="tabler:check"
      size="1.125em"
      class="pui-dynamic-select-icon"
    />
  </button>
</template>

<script lang="ts" setup>
import type { Primitive } from '@pruvious/utils'
import type { PUIDynamicSelectChoiceModel } from './PUIDynamicSelect.vue'

defineProps({
  /**
   * The select choice.
   */
  choice: {
    type: Object as PropType<PUIDynamicSelectChoiceModel>,
    required: true,
  },

  /**
   * The current value of the select field.
   */
  selectedValue: {
    type: null as unknown as PropType<Primitive>,
    required: true,
  },

  /**
   * The currently highlighted choice in the select field
   */
  highlightedChoice: {
    type: null as unknown as PropType<PUIDynamicSelectChoiceModel | undefined>,
    required: true,
  },

  /**
   * Determines whether mouse events for highlighting are paused.
   */
  mousePaused: {
    type: Boolean,
    required: true,
  },
})

defineEmits<{
  'select': [choice: PUIDynamicSelectChoiceModel]
  'update:highlightedChoice': [highlightedChoice: PUIDynamicSelectChoiceModel | undefined]
  'close': []
  'update:mousePaused': [mousePaused: boolean]
}>()
</script>
