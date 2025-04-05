<template>
  <div
    :tabindex="disabled ? -1 : 0"
    @blur="focusVisible = false"
    @keydown.left.prevent.stop="
      $emit('update:modelValue', prev({ value: modelValue } as any, choices, { prop: 'value' }).value)
    "
    @keydown.right.prevent.stop="
      $emit('update:modelValue', next({ value: modelValue } as any, choices, { prop: 'value' }).value)
    "
    @keydown.space.prevent.stop="
      $emit('update:modelValue', next({ value: modelValue } as any, choices, { prop: 'value', loop: true }).value)
    "
    ref="root"
    role="group"
    class="pui-button-group"
    :class="[
      `pui-button-group-${variant}`,
      {
        'pui-button-group-has-errors': error,
        'pui-button-group-disabled': disabled,
        'pui-button-group-focus-visible': focusVisible,
      },
    ]"
    :style="{ '--pui-size': size }"
  >
    <span
      v-for="({ value, label }, i) of choices"
      @click="$emit('update:modelValue', value)"
      class="pui-button-group-item"
      :class="{ 'pui-button-group-item-active': value === modelValue }"
    >
      <slot :index="i" :label="label" :value="value">{{ label }}</slot>
    </span>

    <input :id="id" :name="name" :value="modelValue" hidden />
  </div>
</template>

<script lang="ts" setup>
import { next, prev, type Primitive } from '@pruvious/utils'
import { puiTrigger } from '../pui/trigger'

export interface PUIButtonGroupChoiceModel {
  /**
   * An optional label to display for the button (choice) in the group.
   *
   * If not provided, the `value` will be displayed instead.
   */
  label?: string

  /**
   * The value of the button (choice).
   * It must be unique among the choices in the group.
   */
  value: Primitive
}

const props = defineProps({
  /**
   * The value of the selected button in the group.
   */
  modelValue: {
    type: null as unknown as PropType<Primitive>,
    required: true,
  },

  /**
   * The choices to display in the button group.
   *
   * @example
   * ```ts
   * [
   *   { label: 'String', value: 'foo' },
   *   { label: 'Number', value: 1337 },
   *   { label: 'Boolean', value: true },
   * ]
   * ```
   */
  choices: {
    type: Array as PropType<PUIButtonGroupChoiceModel[]>,
    required: true,
  },

  /**
   * Defines the visual style variant of the buttons.
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
   * Indicates whether the button group has errors.
   *
   * @default false
   */
  error: {
    type: Boolean,
    default: false,
  },

  /**
   * Indicates whether the button group is disabled.
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
   * The `name` attribute of the hidden input element that holds the selected value.
   */
  name: {
    type: String,
  },
})

const emit = defineEmits<{
  'update:modelValue': [value: Primitive]
}>()

const { listen } = puiTrigger()
const root = useTemplateRef('root')
const focusVisible = ref(false)

let stop: (() => void) | undefined

/**
 * Listens for click events on the associated label element.
 */
watch(
  () => props.id,
  (id) => {
    if (id) {
      stop = listen(`focus:${id}`, () => {
        if (!props.disabled) {
          root.value?.focus()
          focusVisible.value = true
        }
      })
    } else {
      stop?.()
    }
  },
  { immediate: true },
)
</script>

<style>
.pui-button-group {
  flex-shrink: 0;
  display: inline-flex;
  gap: 0.125rem;
  max-width: 100%;
  height: calc(2em + 0.25rem);
  padding: 0.125rem;
  overflow-x: auto;
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--pui-foreground) / 0.25) transparent;
  background-color: hsl(var(--pui-card));
  border: 1px solid hsl(var(--pui-input));
  border-radius: calc(var(--pui-radius) - 0.125rem);
  font-size: calc(1rem + var(--pui-size) * 0.125rem);
  line-height: 1.5;
  white-space: nowrap;
  transition: var(--pui-transition);
  transition-property: border-color, box-shadow;
}

.pui-button-group-has-errors {
  --pui-ring: var(--pui-destructive);
  border-color: hsl(var(--pui-destructive));
}

.pui-button-group:focus-visible,
.pui-button-group-focus-visible {
  border-color: transparent;
  box-shadow: 0 0 0 0.125rem hsl(var(--pui-ring));
  outline: none;
}

.pui-button-group-disabled {
  pointer-events: none;
}

.pui-button-group-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5em;
  min-width: min-content;
  height: 100%;
  padding: 0 0.5em;
  padding: 0 round(0.5em, 1px);
  cursor: pointer;
  border-radius: calc(var(--pui-radius) - 0.25rem);
  outline: none;
  color: hsl(var(--pui-foreground));
  font-size: calc(1em - 0.0625rem);
  font-weight: 500;
  transition: var(--pui-transition);
  transition-property: background-color, box-shadow, color;
}

.pui-button-group-primary .pui-button-group-item-active {
  background-color: hsl(var(--pui-primary));
  color: hsl(var(--pui-primary-foreground));
}

.pui-button-group-primary .pui-button-group-item:not(.pui-button-group-item-active):hover {
  background-color: hsl(var(--pui-accent));
  color: hsl(var(--pui-accent-foreground));
}

.pui-button-group-accent .pui-button-group-item-active {
  background-color: hsl(var(--pui-accent));
  color: hsl(var(--pui-accent-foreground));
}

.pui-button-group-accent .pui-button-group-item:not(.pui-button-group-item-active):hover {
  background-color: hsl(var(--pui-secondary));
  color: hsl(var(--pui-secondary-foreground));
}

.pui-button-group-has-errors .pui-button-group-item-active {
  background-color: hsl(var(--pui-destructive));
  color: hsl(var(--pui-destructive-foreground));
}

.pui-button-group-disabled .pui-button-group-item {
  color: hsl(var(--pui-muted-foreground) / 0.64);
  font-weight: 400;
}

.pui-button-group-disabled .pui-button-group-item-active {
  background-color: hsl(var(--pui-muted));
  color: hsl(var(--pui-muted-foreground));
}
</style>
