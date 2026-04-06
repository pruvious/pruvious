<template>
  <PUIField v-if="!options.ui.hidden">
    <PruviousFieldLabel :id="id" :name="name" :options="options" :synced="synced" :translatable="translatable" />

    <div
      class="p-field-rich-text"
      :class="{
        'p-field-rich-text-has-errors': !!error,
        'p-field-rich-text-disabled': disabled,
        'p-field-rich-text-focused': isFocused,
      }"
    >
      <PruviousRichText
        :allowLineBreaks="options.allowLineBreaks"
        :disabled="disabled"
        :marks="options.marks ?? {}"
        :maybeTranslate="maybeTranslate"
        :modelValue="modelValue"
        :normalizeWhitespace="options.normalizeWhitespace"
        :placeholder="placeholder"
        :toolbar="options.ui?.liveEditor?.toolbar ?? 'auto'"
        @blur="onBlur"
        @focus="isFocused = true"
        @update:modelValue="onUpdate"
        dashboard
        enterInsertsLineBreak
        nativeTabNavigation
        ref="richTextRef"
        tag="div"
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
    type: Object as PropType<SerializableFieldOptions<'richText'>>,
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
const isFocused = ref(false)
const placeholder = maybeTranslate(props.options.ui.placeholder)
const richTextRef = ref<ComponentPublicInstance>()

listen(`focus:${id}`, () => {
  if (!props.disabled) {
    richTextRef.value?.$el?.focus()
  }
})

function onUpdate(html: string) {
  emit('update:modelValue', html)
}

function onBlur() {
  isFocused.value = false
  emit('commit', props.modelValue)
}
</script>

<style>
.p-field-rich-text {
  position: relative;
  display: flex;
  width: 100%;
  overflow: hidden;
  background-color: hsl(var(--pui-card));
  border: 1px solid hsl(var(--pui-input));
  border-radius: calc(var(--pui-radius) - 0.125rem);
  font-size: calc(1rem + var(--pui-size) * 0.125rem);
  transition: var(--pui-transition);
  transition-property: border-color, box-shadow;
}

.p-field-rich-text:not(.p-field-rich-text-disabled).p-field-rich-text-focused {
  border-color: transparent;
  box-shadow: 0 0 0 0.125rem hsl(var(--pui-ring));
  outline: none;
}

.p-field-rich-text-has-errors {
  --pui-ring: var(--pui-destructive);
  border-color: hsl(var(--pui-destructive));
}

.p-field-rich-text-disabled {
  --pui-foreground: var(--pui-muted-foreground);
  background-color: hsl(var(--pui-muted));
  color: hsl(var(--pui-muted-foreground));
}

.p-field-rich-text .p-rich-text {
  width: 100%;
  min-height: calc(2em + 0.125rem);
  padding: calc(0.5em - 0.15625rem) 0.5em;
  outline: none;
  font-size: 1em;
  line-height: 1.5;
  color: hsl(var(--pui-foreground));
}
</style>
