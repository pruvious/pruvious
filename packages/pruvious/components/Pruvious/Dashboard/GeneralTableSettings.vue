<template>
  <div class="p-general-table-settings">
    <div>{{ modelValue }}</div>
  </div>
</template>

<script lang="ts" setup>
import type { Collections, SerializableCollection } from '#pruvious/server'
import type { TableSettings } from './TableSettingsPopup.vue'

const props = defineProps({
  /**
   * The current `TableSettings`.
   */
  modelValue: {
    type: Object as PropType<TableSettings>,
    required: true,
  },

  /**
   * The name and definition of the current translatable collection.
   */
  collection: {
    type: Object as PropType<{ name: keyof Collections; definition: SerializableCollection }>,
    required: true,
  },

  /**
   * The available column choices.
   */
  columnChoices: {
    type: Array as PropType<{ label: string; value: string }[]>,
    required: true,
  },
})

const emit = defineEmits<{
  'commit': [settings: TableSettings]
  'update:modelValue': [settings: TableSettings]
}>()
</script>
