<template>
  <PUIFieldLabel :required="options.required">
    <label :for="id">{{ label }}</label>
    <Icon
      v-if="translatable && synced"
      v-pui-tooltip="
        __('pruvious-dashboard', 'Changes made to this field will automatically sync across all translations.')
      "
      mode="svg"
      name="tabler:language"
      class="pui-muted"
    />
  </PUIFieldLabel>
</template>

<script lang="ts" setup>
import { __, resolveFieldLabel } from '#pruvious/client'
import type { GenericSerializableFieldOptions } from '#pruvious/server'

const props = defineProps({
  /**
   * The field name defined in a collection, singleton, or block.
   */
  name: {
    type: String,
    required: true,
  },

  /**
   * The combined field options defined in a collection, singleton, or block.
   */
  options: {
    type: Object as PropType<GenericSerializableFieldOptions>,
    required: true,
  },

  /**
   * Specifies whether the current data record is translatable.
   *
   * @default false
   */
  translatable: {
    type: Boolean,
    default: false,
  },

  /**
   * Indicates if the field value remains synchronized between all translations of the current data record.
   *
   * @default false
   */
  synced: {
    type: Boolean,
    default: false,
  },

  /**
   * Defines a unique identifier (ID) which must be unique in the whole document.
   * Its purpose is to identify the element when linking (using a fragment identifier), scripting, or styling (with CSS).
   */
  id: {
    type: String,
    required: true,
  },
})

const label = resolveFieldLabel(props.options.ui.label, props.name)
</script>
