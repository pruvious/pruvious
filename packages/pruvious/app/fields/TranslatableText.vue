<template>
  <PUIField v-if="!options.ui.hidden">
    <PUICard :class="{ 'p-object-has-error': objectErrors }">
      <template v-if="label" #header>
        <span class="pui-block pui-medium pui-truncate">{{ label }}</span>
      </template>

      <PUIField v-for="language of languages">
        <PruviousFieldLabel
          :id="`${id}--${language.code}`"
          :name="name"
          :options="{ ...options, ui: { ...options.ui, label: `${language.name} (${language.code.toUpperCase()})` } }"
          :synced="synced"
          :translatable="translatable"
        />

        <PUITextArea
          :disabled="disabled"
          :error="!!subfieldErrors?.[language.code]"
          :id="`${id}--${language.code}`"
          :modelValue="modelValue[language.code] || ''"
          :name="`${path}--${language.code}`"
          :placeholder="placeholder"
          @blur="(_, value) => $emit('commit', { ...modelValue, [language.code]: value })"
          @update:modelValue="$emit('update:modelValue', { ...modelValue, [language.code]: $event })"
        />

        <PruviousFieldMessage
          :error="subfieldErrors?.[language.code]"
          :name="name"
          :options="{ ...options, ui: omit(options.ui, ['description']) }"
        />
      </PUIField>
    </PUICard>

    <PruviousFieldMessage :error="objectErrors" :name="name" :options="options" />
  </PUIField>
</template>

<script lang="ts" setup>
import { languages, maybeTranslate, resolveFieldLabel } from '#pruvious/client'
import type { LanguageCode, SerializableFieldOptions } from '#pruvious/server'
import { isObject, omit } from '@pruvious/utils'

const props = defineProps({
  /**
   * The casted field value.
   */
  modelValue: {
    type: Object as PropType<Record<LanguageCode, string>>,
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
    type: Object as PropType<SerializableFieldOptions<'translatableText'>>,
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

const emit = defineEmits<{
  'commit': [value: Record<LanguageCode, string>]
  'update:modelValue': [value: Record<LanguageCode, string>]
}>()

const id = useId()
const label = resolveFieldLabel(props.options.ui.label, props.name)
const placeholder = maybeTranslate(props.options.ui.placeholder)
const objectErrors = computed(() => (isObject(props.error) ? props.error[props.name] : props.error))
const subfieldErrors = computed<Record<string, string | string[] | undefined> | undefined>(() =>
  isObject(props.error) ? omit(props.error, [props.name] as any) : undefined,
)

watch(
  () => props.modelValue,
  (newValue) => {
    for (const language of languages) {
      if (!(language.code in newValue)) {
        emit('update:modelValue', { ...newValue, [language.code]: '' })
      }
    }
  },
  { immediate: true },
)
</script>

<style scoped>
.p-object-has-error {
  border-color: hsl(var(--pui-destructive));
}
</style>
