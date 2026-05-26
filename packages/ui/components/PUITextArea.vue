<template>
  <div
    @dblclick.stop
    class="pui-text-area"
    :class="{
      'pui-text-area-has-errors': error,
      'pui-text-area-disabled': disabled,
    }"
    :style="{ '--pui-size': size }"
  >
    <slot name="prefix" />

    <textarea
      :autofocus="autofocus"
      :disabled="disabled"
      :id="id"
      :name="name"
      :placeholder="placeholder"
      :rows="rows"
      :spellcheck="spellcheck"
      :value="modelValue"
      @blur="$emit('blur', $event, ($event.target as HTMLInputElement).value)"
      @focus="$emit('focus', $event, ($event.target as HTMLInputElement).value)"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @keydown.escape.stop="blurActiveElement()"
      ref="textArea"
      class="pui-text-area-control"
      :class="{ 'pui-text-area-control-resize-manual': resize === 'manual' }"
    />

    <slot name="suffix" />
  </div>
</template>

<script lang="ts" setup>
import { blurActiveElement } from '@pruvious/utils'
import { useTextareaAutosize } from '@vueuse/core'

const props = defineProps({
  /**
   * The value of the text area field.
   */
  modelValue: {
    type: String,
    required: true,
  },

  /**
   * Adjusts the size of the component.
   *
   * Examples:
   *
   * - -2 (very small)
   * - -1 (small)
   * - 0 (default size)
   * - 1 (large)
   * - 2 (very large)
   *
   * By default, the value is inherited as the CSS variable `--pui-size` from the parent element.
   */
  size: {
    type: Number,
  },

  /**
   * An optional placeholder text to display when the text area is empty.
   */
  placeholder: {
    type: String,
  },

  /**
   * Initial number of visible text lines.
   * Only used when `resize` is set to `false` or `'manual'`.
   *
   * @default 1
   */
  rows: {
    type: Number,
    default: 1,
  },

  /**
   * Controls how the textarea resizes.
   *
   * - `false` - Fixed height based on `rows`.
   * - `'manual'` - User can manually resize the textarea.
   * - `'auto'` - Automatically adjusts height based on content.
   *
   * @default 'auto'
   */
  resize: {
    type: [Boolean, String] as PropType<false | 'manual' | 'auto'>,
    default: 'auto',
  },

  /**
   * Indicates whether the text area has errors.
   *
   * @default false
   */
  error: {
    type: Boolean,
    default: false,
  },

  /**
   * Indicates whether the text area is disabled.
   *
   * @default false
   */
  disabled: {
    type: Boolean,
    default: false,
  },

  /**
   * Defines a unique identifier (ID) which must be unique in the whole document.
   * Its purpose is to identify the element when linking (using a fragment identifier), scripting, or styling (with CSS).
   */
  id: {
    type: String,
  },

  /**
   * The `name` attribute of the text area field.
   */
  name: {
    type: String,
  },

  /**
   * The `spellcheck` attribute of the text area field.
   *
   * @default false
   */
  spellcheck: {
    type: Boolean,
    default: false,
  },

  /**
   * The `autofocus` attribute of the text area field.
   *
   * @default false
   */
  autofocus: {
    type: Boolean,
    default: false,
  },
})

defineEmits<{
  'update:modelValue': [value: string]
  'focus': [event: FocusEvent, value: string]
  'blur': [event: FocusEvent, value: string]
}>()

const textArea = useTemplateRef('textArea')
const input = computed(() => props.modelValue)

if (props.resize === 'auto') {
  useTextareaAutosize({ input, element: textArea })
}

defineExpose({ textArea })
</script>

<style>
.pui-text-area {
  --pui-base-size: var(--pui-size);
  display: flex;
  align-items: center;
  width: 100%;
  overflow: hidden;
  background-color: hsl(var(--pui-card));
  border: 1px solid hsl(var(--pui-input));
  border-radius: calc(var(--pui-radius) - 0.125rem);
  font-size: calc(1rem + var(--pui-size) * 0.125rem);
  transition: var(--pui-transition);
  transition-property: border-color, box-shadow;
}

.pui-text-area:not(.pui-text-area-disabled):focus-within {
  border-color: transparent;
  box-shadow: 0 0 0 0.125rem hsl(var(--pui-ring));
  outline: none;
}

.pui-text-area-has-errors {
  --pui-ring: var(--pui-destructive);
  border-color: hsl(var(--pui-destructive));
}

.pui-text-area-disabled {
  --pui-foreground: var(--pui-muted-foreground);
  background-color: hsl(var(--pui-muted));
  color: hsl(var(--pui-muted-foreground));
}

.pui-text-area-control {
  display: flex;
  width: 100%;
  min-height: calc(2em + 0.125rem);
  padding: calc(0.5em - 0.15625rem) 0.5em;
  overflow: hidden;
  -ms-overflow-style: none;
  scrollbar-width: none;
  background-color: transparent;
  border: none;
  outline: none;
  resize: none;
  font-size: 1em;
  line-height: 1.5;
  color: hsl(var(--pui-foreground));
}

.pui-text-area-control::-webkit-scrollbar {
  display: none;
}

.pui-text-area-control::placeholder {
  color: hsl(var(--pui-muted-foreground));
}

.pui-text-area-control-resize-manual {
  resize: vertical;
}
</style>
