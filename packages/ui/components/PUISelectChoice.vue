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
    class="pui-select-choice pui-raw"
    :class="{
      'pui-select-choice-selected': choice.value === selectedValue,
      'pui-select-choice-highlighted': choice.value === highlightedChoice?.value,
      'pui-select-choice-disabled': choice.disabled,
    }"
  >
    <span v-if="choice.value === highlightedChoice?.value && choice.label && keywordTimeout.isPending.value">
      <component
        v-for="(char, i) of choice.label"
        :is="i >= keywordHiglight[0] && i <= keywordHiglight[1] ? 'u' : 'span'"
      >
        {{ char }}
      </component>
    </span>

    <span v-else :title="choice.label ?? String(choice.value)">{{ choice.label ?? choice.value }}</span>

    <Icon v-if="choice.value === selectedValue" mode="svg" name="tabler:check" size="1.125em" class="pui-select-icon" />
  </button>
</template>

<script lang="ts" setup>
import type { Primitive } from '@pruvious/utils'
import type { PUISelectChoiceModel } from './PUISelect.vue'

defineProps({
  /**
   * The select choice.
   */
  choice: {
    type: Object as PropType<PUISelectChoiceModel>,
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
    type: null as unknown as PropType<PUISelectChoiceModel | undefined>,
    required: true,
  },

  /**
   * Determines whether mouse events for highlighting are paused.
   */
  mousePaused: {
    type: Boolean,
    required: true,
  },

  /**
   * The start and end index of the keyword to highlight in the choice label.
   */
  keywordHiglight: {
    type: Object as PropType<[number, number]>,
    required: true,
  },

  /**
   * Timeout used to highlight the keyword in the choice label.
   */
  keywordTimeout: {
    type: Object as PropType<{ isPending: { value: boolean } }>,
    required: true,
  },
})

defineEmits<{
  'select': [choice: PUISelectChoiceModel]
  'update:highlightedChoice': [highlightedChoice: PUISelectChoiceModel | undefined]
  'close': []
  'update:mousePaused': [mousePaused: boolean]
}>()
</script>
