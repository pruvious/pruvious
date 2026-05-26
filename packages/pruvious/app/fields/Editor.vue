<template>
  <PUIField v-if="!options.ui.hidden">
    <PruviousFieldLabel :id="id" :name="name" :options="options" :synced="synced" :translatable="translatable" />

    <div
      class="p-field-editor"
      :class="{
        'p-field-editor-has-errors': !!error,
        'p-field-editor-disabled': disabled,
        'p-field-editor-focused': isFocused,
      }"
    >
      <PruviousEditor
        :blocks="options.blocks"
        :disabled="disabled"
        :links="options.links ?? false"
        :marks="options.marks ?? {}"
        :modelValue="modelValue"
        :normalizeWhitespace="options.normalizeWhitespace"
        :placeholder="placeholder"
        :toolbar="options.ui?.toolbar ?? 'auto'"
        @blur="onBlur"
        @commit="onCommit"
        @focus="isFocused = true"
        @linkApplied="onLinkApplied"
        @update:modelValue="onUpdate"
        ref="editorRef"
      />
    </div>

    <PruviousFieldMessage :error="error" :name="name" :options="options" />
  </PUIField>
</template>

<script lang="ts" setup>
import { maybeTranslate } from '#pruvious/dashboard'
import type { SerializableFieldOptions } from '#pruvious/server'
import { puiTrigger } from '@pruvious/ui/pui/trigger'

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
    type: Object as PropType<SerializableFieldOptions<'editor'>>,
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
  'commit': [value: string]
  'update:modelValue': [value: string]
}>()

const id = useId()
const { listen } = puiTrigger()
const placeholder = maybeTranslate(props.options.ui.placeholder) ?? ''
const editorRef = ref<{ focus: () => void }>()
const isFocused = ref(false)

listen(`focus:${id}`, () => {
  if (!props.disabled) {
    editorRef.value?.focus()
  }
})

function onUpdate(html: string) {
  emit('update:modelValue', html)
}

function onCommit(html: string) {
  emit('commit', html)
}

function onLinkApplied(html: string) {
  emit('commit', html)
}

function onBlur() {
  isFocused.value = false
  emit('commit', props.modelValue)
}
</script>

<style>
.p-field-editor {
  position: relative;
  display: flex;
  width: 100%;
  overflow: clip;
  background-color: hsl(var(--pui-card));
  border: 1px solid hsl(var(--pui-input));
  border-radius: calc(var(--pui-radius) - 0.125rem);
  font-size: calc(1rem + var(--pui-size) * 0.125rem);
  transition: var(--pui-transition);
  transition-property: border-color, box-shadow;
}

.p-field-editor:not(.p-field-editor-disabled).p-field-editor-focused {
  border-color: transparent;
  box-shadow: 0 0 0 0.125rem hsl(var(--pui-ring));
  outline: none;
}

.p-field-editor-has-errors {
  --pui-ring: var(--pui-destructive);
  border-color: hsl(var(--pui-destructive));
}

.p-field-editor-disabled {
  --pui-foreground: var(--pui-muted-foreground);
  background-color: hsl(var(--pui-muted));
  color: hsl(var(--pui-muted-foreground));
}
</style>
