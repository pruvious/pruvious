<template>
  <PUIField v-if="!options.ui.hidden">
    <PUISwitch
      :disabled="disabled"
      :error="!!error"
      :id="id"
      :modelValue="modelValue"
      :name="name"
      :variant="options.ui.variant"
      @update:modelValue="
        (value) => {
          $emit('update:modelValue', value)
          $emit('commit', value)
        }
      "
    >
      {{ label }}
    </PUISwitch>

    <PUIFieldMessage v-if="error" error>
      <p>{{ error }}</p>
    </PUIFieldMessage>
    <PUIFieldMessage v-else-if="description">
      <div v-html="description"></div>
    </PUIFieldMessage>
  </PUIField>
</template>

<script lang="ts" setup>
import { __, maybeTranslate } from '#pruvious/client'
import type { SerializableFieldOptions } from '#pruvious/server'
import { isDefined, titleCase } from '@pruvious/utils'
import { marked } from 'marked'

const props = defineProps({
  /**
   * The casted field value.
   */
  modelValue: {
    type: Boolean,
    required: true,
  },

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
    type: Object as PropType<SerializableFieldOptions<'switch'>>,
    required: true,
  },

  /**
   * The field path, expressed in dot notation, represents the exact location of the field within the current data structure.
   */
  path: {
    type: String,
    required: true,
  },

  /**
   * Represents an error message that can be displayed to the user.
   */
  error: {
    type: String,
  },

  /**
   * Controls whether the field is disabled.
   *
   * @default false
   */
  disabled: {
    type: Boolean,
    default: false,
  },
})

defineEmits<{
  'commit': [value: boolean]
  'update:modelValue': [value: boolean]
}>()

const id = useId()
const label = computed(() =>
  isDefined(props.options.ui.label)
    ? maybeTranslate(props.options.ui.label)
    : __('pruvious-dashboard', titleCase(props.name, false) as any),
)
const description = computed(() => marked.parse(maybeTranslate(props.options.ui.description) ?? ''))
</script>
