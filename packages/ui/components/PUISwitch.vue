<template>
  <div
    class="pui-switch"
    :class="[
      `pui-switch-${variant}`,
      {
        'pui-switch-has-errors': error,
        'pui-switch-disabled': disabled,
      },
    ]"
    :style="{ '--pui-size': size }"
  >
    <input
      :checked="modelValue"
      :data-checked="modelValue"
      :id="localId"
      :modelValue="modelValue"
      :name="name"
      @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
      hidden
      ref="input"
      type="checkbox"
      class="pui-switch-control"
    />

    <button
      :aria-checked="modelValue"
      :disabled="disabled"
      @click="input?.click()"
      role="switch"
      type="button"
      class="pui-switch-button pui-raw"
    ></button>

    <label v-if="$slots.default" :for="localId" @click="disabled && $event.preventDefault()" class="pui-switch-label">
      <slot />
    </label>
  </div>
</template>

<script lang="ts" setup>
const props = defineProps({
  /**
   * The value of the switch field.
   */
  modelValue: {
    type: Boolean,
    required: true,
  },

  /**
   * Defines the visual style variant of the switch.
   *
   * @default 'primary'
   */
  variant: {
    type: String as PropType<'primary' | 'accent'>,
    default: 'primary',
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
})

defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const nuxtId = useId()
const localId = computed(() => props.id || nuxtId)
const input = useTemplateRef('input')
</script>

<style>
.pui-switch {
  display: flex;
  align-items: center;
  gap: 0.625em;
  width: 100%;
  max-width: 100%;
  font-size: calc(1rem + var(--pui-size) * 0.125rem);
}

.pui-switch + .pui-switch {
  margin-top: 0.625em;
}

.pui-switch-control {
  display: none;
}

.pui-switch-button {
  flex-shrink: 0;
  display: flex;
  width: calc(2em + 0.5rem);
  height: calc(1em + 0.375rem);
  padding: 0.125rem;
  background-color: hsl(var(--pui-border));
  border-radius: 2em;
  transition: var(--pui-transition);
  transition-property: background-color, box-shadow;
}

.pui-switch-button::after {
  content: '';
  width: calc(1em + 0.125rem);
  height: calc(1em + 0.125rem);
  border-radius: 50%;
  background-color: hsl(var(--pui-card));
  transition: var(--pui-transition);
  transition-property: transform;
}

.pui-switch-primary .pui-switch-control[data-checked='true'] + .pui-switch-button {
  background-color: hsl(var(--pui-primary));
}

.pui-switch-accent .pui-switch-control[data-checked='true'] + .pui-switch-button {
  background-color: hsl(var(--pui-accent));
}

.pui-switch-control[data-checked='true'] + .pui-switch-button::after {
  transform: translateX(100%);
}

.pui-switch-has-errors .pui-switch-button {
  --pui-ring: var(--pui-destructive);
}

.pui-switch-has-errors .pui-switch-control[data-checked] + .pui-switch-button {
  background-color: hsl(var(--pui-destructive));
}

.pui-switch-button:focus-visible {
  box-shadow:
    0 0 0 0.125rem hsl(var(--pui-background)),
    0 0 0 0.25rem hsl(var(--pui-ring)),
    0 0 #0000;
  outline: 0.125rem solid transparent;
  outline-offset: 0.125rem;
}

.pui-switch-disabled,
.pui-switch-disabled .pui-switch-label {
  cursor: not-allowed;
}

.pui-switch-disabled .pui-switch-button {
  pointer-events: none;
}

.pui-switch-label {
  font-size: calc(1em - 0.0625rem);
  font-weight: 500;
}
</style>
