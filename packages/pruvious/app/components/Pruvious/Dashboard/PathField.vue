<template>
  <PUIField v-if="!options.ui.hidden">
    <PruviousFieldLabel
      :id="`${id}--switch`"
      :name="name"
      :options="options"
      :synced="synced"
      :translatable="translatable"
    />

    <div class="pui-row">
      <PUIButtonGroup
        :choices="[
          { value: false, label: offLabel },
          { value: true, label: onLabel },
        ]"
        :id="`${id}--switch`"
        :modelValue="modelValue !== null"
        :name="`${name}--switch`"
        :variant="options.ui.switch?.variant ?? 'accent'"
        @update:modelValue="
          (value) => {
            $emit('update:modelValue', value ? lastString : null)
            $emit('commit', value ? lastString : null)
          }
        "
        class="p-switch"
      />

      <PUIInput
        v-if="modelValue !== null"
        :disabled="disabled"
        :error="!!error"
        :id="`${id}--input`"
        :maxLength="options.maxLength || undefined"
        :minLength="options.minLength || undefined"
        :modelValue="modelValue ?? ''"
        :name="path"
        :placeholder="placeholder"
        @blur="(_, value) => $emit('commit', value)"
        @update:modelValue="$emit('update:modelValue', $event)"
        ref="input"
        class="pui-flex-1"
      >
        <template v-if="resolvedPrefix" #prefix>
          <span @click="input?.input?.focus()" class="p-path-prefix pui-muted">{{ resolvedPrefix }}</span>
        </template>
      </PUIInput>
    </div>

    <PruviousFieldMessage :error="error" :name="name" :options="options" />
  </PUIField>
</template>

<script lang="ts" setup>
import { __, maybeTranslate, primaryLanguage } from '#pruvious/client'
import type { SerializableFieldOptions } from '#pruvious/server'
import { isDefined, isString } from '@pruvious/utils'

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

  /**
   * The prefix to display before the input value.
   */
  prefix: {
    type: String,
  },
})

defineEmits<{
  'commit': [value: string | null]
  'update:modelValue': [value: string | null]
}>()

const id = useId()
const input = useTemplateRef('input')
const { prefixPrimaryLanguage } = useRuntimeConfig().public.pruvious
const offLabel = isDefined(props.options.ui.switch?.offLabel)
  ? maybeTranslate(props.options.ui.switch.offLabel)
  : __('pruvious-dashboard', 'Off')
const onLabel = isDefined(props.options.ui.switch?.onLabel)
  ? maybeTranslate(props.options.ui.switch.onLabel)
  : __('pruvious-dashboard', 'On')
const placeholder = maybeTranslate(props.options.ui.placeholder)
const language = props.name.replace('path', '').toLowerCase()
const resolvedPrefix = props.prefix ?? (language !== primaryLanguage || prefixPrimaryLanguage ? `/${language}` : '')
const lastString = ref('')

watch(
  () => props.modelValue,
  (value) => {
    if (isString(value)) {
      lastString.value = value
    }
  },
  { immediate: true },
)
</script>

<style scoped>
.p-switch {
  width: auto;
}

.p-path-prefix {
  margin-right: 0;
}

.p-path-prefix + :deep(.pui-input-control) {
  padding-left: 0;
}
</style>
