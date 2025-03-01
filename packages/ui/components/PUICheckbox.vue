<template>
  <div
    @dblclick.stop
    class="pui-checkbox"
    :class="[
      `pui-checkbox-${variant}`,
      {
        'pui-checkbox-has-content': $slots.default || $slots.description,
        'pui-checkbox-has-errors': error,
        'pui-checkbox-disabled': disabled,
      },
    ]"
    :style="{ '--pui-size': size }"
  >
    <input
      :checked="modelValue"
      :data-checked="modelValue"
      :id="localId"
      :name="name"
      @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
      hidden
      ref="input"
      type="checkbox"
      class="pui-checkbox-control"
    />

    <button
      :aria-checked="modelValue"
      :disabled="disabled"
      @click="input?.click()"
      role="checkbox"
      type="button"
      class="pui-checkbox-button pui-raw"
    >
      <Icon v-if="indeterminate" mode="svg" name="tabler:minus" size="0.875em" class="pui-stroke-2" />
      <Icon v-else mode="svg" name="tabler:check" size="0.875em" class="pui-stroke-2" />
    </button>

    <div v-if="$slots.default || $slots.description" class="pui-checkbox-content">
      <label
        v-if="$slots.default"
        :for="localId"
        @click="disabled && $event.preventDefault()"
        class="pui-checkbox-label"
      >
        <slot />
      </label>

      <div v-if="$slots.description" class="pui-checkbox-description">
        <slot name="description" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
const props = defineProps({
  /**
   * The value of the checkbox field.
   */
  modelValue: {
    type: Boolean,
    required: true,
  },

  /**
   * Indicates whether the checkbox is in an indeterminate state.
   *
   * @default false
   */
  indeterminate: {
    type: Boolean,
    default: false,
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
.pui-checkbox {
  display: inline-flex;
  gap: 0.625em;
  max-width: 100%;
  font-size: calc(1rem + var(--pui-size) * 0.125rem);
}

.pui-checkbox-has-content {
  width: 100%;
}

.pui-checkbox + .pui-checkbox {
  margin-top: 0.625em;
}

.pui-checkbox-control {
  display: none;
}

.pui-checkbox-button {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  width: calc(1em + 0.125rem);
  height: calc(1em + 0.125rem);
  background-color: hsl(var(--pui-card));
  border: 1px solid hsl(var(--pui-input));
  border-radius: calc(var(--pui-radius) - 0.25rem);
  color: transparent;
}

.pui-checkbox-button:not(:last-child) {
  margin-top: calc(0.25em - 0.0625rem);
}

.pui-checkbox-primary .pui-checkbox-control[data-checked='true'] + .pui-checkbox-button {
  background-color: hsl(var(--pui-primary));
  border-color: transparent;
  color: hsl(var(--pui-primary-foreground));
}

.pui-checkbox-accent .pui-checkbox-control[data-checked='true'] + .pui-checkbox-button {
  background-color: hsl(var(--pui-accent));
  border-color: transparent;
  color: hsl(var(--pui-accent-foreground));
}

.pui-checkbox-has-errors .pui-checkbox-button {
  --pui-ring: var(--pui-destructive);
  border-color: hsl(var(--pui-destructive));
}

.pui-checkbox-has-errors .pui-checkbox-control[data-checked='true'] + .pui-checkbox-button {
  background-color: hsl(var(--pui-destructive));
  color: hsl(var(--pui-destructive-foreground));
}

.pui-checkbox-button:focus-visible {
  border-color: transparent;
  box-shadow:
    0 0 0 0.125rem hsl(var(--pui-background)),
    0 0 0 0.25rem hsl(var(--pui-ring)),
    0 0 #0000;
  outline: 0.125rem solid transparent;
  outline-offset: 0.125rem;
}

.pui-checkbox-disabled .pui-checkbox-button {
  opacity: 0.5;
  pointer-events: none;
}

.pui-checkbox-content {
  flex: 1;
}

.pui-checkbox-label {
  font-size: calc(1em - 0.0625rem);
  font-weight: 500;
}

.pui-checkbox-description {
  font-size: calc(1em - 0.125rem);
  color: hsl(var(--pui-muted-foreground));
}
</style>
