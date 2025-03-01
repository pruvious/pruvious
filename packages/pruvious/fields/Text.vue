<template>
  <PUIField v-if="!options.ui.hidden">
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

    <PUIInput
      :disabled="disabled"
      :error="!!error"
      :id="id"
      :maxLength="options.maxLength || undefined"
      :minLength="options.minLength || undefined"
      :modelValue="modelValue"
      :name="path"
      :placeholder="placeholder"
      @blur="(_, value) => $emit('commit', value)"
      @update:modelValue="$emit('update:modelValue', $event)"
    />

    <PUIFieldMessage v-if="error" error>
      <p>{{ error }}</p>
    </PUIFieldMessage>
    <PUIFieldMessage v-else-if="description">
      <p>{{ description }}</p>
    </PUIFieldMessage>
  </PUIField>
</template>

<script lang="ts" setup>
import { __, maybeTranslate } from '#pruvious/client'
import type { SerializableFieldOptions } from '#pruvious/server'
import { isDefined, titleCase } from '@pruvious/utils'

const props = defineProps({
  /**
   * The casted field value.
   */
  modelValue: {
    type: String,
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
    type: Object as PropType<SerializableFieldOptions<'text'>>,
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
})

defineEmits<{
  'commit': [value: string]
  'update:modelValue': [value: string]
}>()

const id = useId()
const label = computed(() =>
  isDefined(props.options.ui.label)
    ? maybeTranslate(props.options.ui.label)
    : __('pruvious-dashboard', titleCase(props.name, false) as any),
)
const description = computed(() => maybeTranslate(props.options.ui.description))
const placeholder = computed(() => maybeTranslate(props.options.ui.placeholder))
</script>
