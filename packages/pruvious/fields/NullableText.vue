<template>
  <PUIField v-if="!options.ui.hidden">
    <PruviousFieldLabel :id="id" :name="name" :options="options" :synced="synced" :translatable="translatable" />

    <div class="pui-row">
      <PUIButtonGroup
        :choices="[
          { value: false, label: offLabel },
          { value: true, label: onLabel },
        ]"
        :id="`${id}--switch`"
        :modelValue="modelValue !== null"
        :name="`${name}--switch`"
        :variant="options.ui.switch?.variant"
        @update:modelValue="
          (value) => {
            $emit('update:modelValue', value ? '' : null)
            $emit('commit', value ? '' : null)
          }
        "
        class="p-switch"
      />

      <PUIInput
        :disabled="disabled || modelValue === null"
        :error="!!error"
        :id="id"
        :maxLength="options.maxLength || undefined"
        :minLength="options.minLength || undefined"
        :modelValue="modelValue ?? ''"
        :name="path"
        :placeholder="placeholder"
        @blur="(_, value) => $emit('commit', value)"
        @update:modelValue="$emit('update:modelValue', $event)"
        class="pui-flex-1"
      />
    </div>

    <PruviousFieldMessage :error="error" :name="name" :options="options" />
  </PUIField>
</template>

<script lang="ts" setup>
import { __, maybeTranslate } from '#pruvious/client'
import type { SerializableFieldOptions } from '#pruvious/server'
import { isDefined } from '@pruvious/utils'

const props = defineProps({
  /**
   * The casted field value.
   */
  modelValue: {
    type: [String, null],
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
    type: Object as PropType<SerializableFieldOptions<'nullableText'>>,
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
  'commit': [value: string | null]
  'update:modelValue': [value: string | null]
}>()

const id = useId()
const offLabel = isDefined(props.options.ui.switch?.offLabel)
  ? maybeTranslate(props.options.ui.switch.offLabel)
  : __('pruvious-dashboard', 'Off')
const onLabel = isDefined(props.options.ui.switch?.onLabel)
  ? maybeTranslate(props.options.ui.switch.onLabel)
  : __('pruvious-dashboard', 'On')
const placeholder = maybeTranslate(props.options.ui.placeholder)
</script>

<style scoped>
.p-switch {
  width: auto;
}
</style>
