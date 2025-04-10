<template>
  <div
    @dblclick.stop
    class="pui-input"
    :class="{
      'pui-input-has-errors': error,
      'pui-input-disabled': disabled,
    }"
    :style="{ '--pui-size': size }"
  >
    <slot name="prefix" />

    <input
      :autocomplete="autocomplete"
      :autofocus="autofocus"
      :disabled="disabled"
      :id="id"
      :maxlength="maxLength"
      :minlength="minLength"
      :name="name"
      :placeholder="placeholder"
      :spellcheck="spellcheck"
      :type="type"
      :value="modelValue"
      @blur="$emit('blur', $event, ($event.target as HTMLInputElement).value)"
      @focus="$emit('focus', $event, ($event.target as HTMLInputElement).value)"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @keydown.escape.stop="blurActiveElement()"
      class="pui-input-control"
    />

    <slot name="suffix" />
  </div>
</template>

<script lang="ts" setup>
import { blurActiveElement } from '@pruvious/utils'

defineProps({
  /**
   * The value of the input field.
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
   * The type of the input field.
   *
   * @default 'text'
   */
  type: {
    type: String,
    default: 'text',
  },

  /**
   * An optional placeholder text to display when the input is empty.
   */
  placeholder: {
    type: String,
  },

  /**
   * The minimum number of characters required in the input field.
   */
  minLength: {
    type: Number,
  },

  /**
   * The maximum number of characters allowed in the input field.
   */
  maxLength: {
    type: Number,
  },

  /**
   * Indicates whether the input has errors.
   *
   * @default false
   */
  error: {
    type: Boolean,
    default: false,
  },

  /**
   * Indicates whether the input is disabled.
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
   * The `name` attribute of the input field.
   */
  name: {
    type: String,
  },

  /**
   * The `autocomplete` attribute of the input field.
   *
   * @default 'off'
   */
  autocomplete: {
    type: String,
    default: 'off',
  },

  /**
   * The `spellcheck` attribute of the input field.
   *
   * @default false
   */
  spellcheck: {
    type: Boolean,
    default: false,
  },

  /**
   * The `autofocus` attribute of the input field.
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
</script>

<style>
.pui-input {
  --pui-base-size: var(--pui-size);
  display: flex;
  align-items: center;
  width: 100%;
  height: calc(2em + 0.25rem);
  overflow: hidden;
  background-color: hsl(var(--pui-card));
  border: 1px solid hsl(var(--pui-input));
  border-radius: calc(var(--pui-radius) - 0.125rem);
  font-size: calc(1rem + var(--pui-size) * 0.125rem);
  transition: var(--pui-transition);
  transition-property: border-color, box-shadow;
}

.pui-input:not(.pui-input-disabled):focus-within {
  border-color: transparent;
  box-shadow: 0 0 0 0.125rem hsl(var(--pui-ring));
  outline: none;
}

.pui-input-has-errors {
  --pui-ring: var(--pui-destructive);
  border-color: hsl(var(--pui-destructive));
}

.pui-input-disabled {
  --pui-foreground: var(--pui-muted-foreground);
  background-color: hsl(var(--pui-muted));
  color: hsl(var(--pui-muted-foreground));
}

.pui-input-control {
  display: flex;
  width: 100%;
  height: 100%;
  padding: 0 0.5em;
  overflow: hidden;
  background-color: transparent;
  border: none;
  outline: none;
  font-size: 1em;
  line-height: 1.25;
  color: hsl(var(--pui-foreground));
  white-space: nowrap;
  text-overflow: ellipsis;
}

.pui-input-control::placeholder {
  color: hsl(var(--pui-muted-foreground));
}

.pui-input > .pui-button {
  --pui-size: calc(var(--pui-base-size) - 1);
  width: calc(2em + 0.125rem);
  height: calc(2em + 0.125rem);
  margin-right: 0.125rem;
  margin-left: 0.125rem;
  border-radius: calc(var(--pui-radius) - 0.25rem);
}

.pui-input > :not(.pui-input-control, .pui-button) {
  flex-shrink: 0;
  margin-right: 0.5em;
  margin-left: 0.5em;
}
</style>
