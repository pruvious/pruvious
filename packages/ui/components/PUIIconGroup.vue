<template>
  <div
    :tabindex="disabled ? -1 : 0"
    @blur="focusVisible = false"
    @keydown.left.prevent.stop="
      $emit('update:modelValue', prev({ value: modelValue } as any, localChoices, { prop: 'value' }).value)
    "
    @keydown.right.prevent.stop="
      $emit('update:modelValue', next({ value: modelValue } as any, localChoices, { prop: 'value' }).value)
    "
    @keydown.space.prevent.stop="
      $emit('update:modelValue', next({ value: modelValue } as any, localChoices, { prop: 'value', loop: true }).value)
    "
    ref="root"
    role="group"
    class="pui-icon-group"
    :class="[
      `pui-icon-group-${variant}`,
      {
        'pui-icon-group-has-errors': error,
        'pui-icon-group-disabled': disabled,
        'pui-button-group-focus-visible': focusVisible,
      },
    ]"
    :style="{ '--pui-size': size }"
  >
    <span
      v-for="{ value, icon, title } of localChoices"
      v-pui-tooltip="showTooltips ? title : undefined"
      :title="!showTooltips ? title : undefined"
      @click="$emit('update:modelValue', value)"
      class="pui-icon-group-item"
      :class="{ 'pui-icon-group-item-active': value === modelValue }"
    >
      <Icon v-if="typeof icon === 'string'" :name="`tabler:${icon}`" mode="svg" class="pui-icon-group-icon" />
      <component v-else-if="icon" :is="icon" class="pui-icon-group-icon" />
    </span>

    <input :id="id" :name="name" :value="modelValue" hidden />
  </div>
</template>

<script lang="ts" setup>
import type { icons as tablerIcons } from '@iconify-json/tabler/icons.json'
import { isObject, next, prev, type Primitive } from '@pruvious/utils'
import { puiTrigger } from '../pui/trigger'

export interface PUIIconGroupChoiceModel {
  /**
   * The value of the choice in the icon group field.
   * It must be unique among the choices in the group.
   */
  value: Primitive

  /**
   * The icon to display for the choice.
   * You can use either a string for Tabler icons or a Vue node for Nuxt icons.
   *
   * @example
   * ```ts
   * // Tabler icon
   * 'phone'
   *
   * // Nuxt icon
   * h(Icon, { name: 'tabler:phone' })
   * ```
   */
  icon?: keyof typeof tablerIcons | VNode

  /**
   * Text set as the `title` HTML attribute of the choice element.
   * If `showTooltips` are enabled, this text appears as a tooltip on hover.
   */
  title?: string
}

const props = defineProps({
  /**
   * The selected value.
   */
  modelValue: {
    type: null as unknown as PropType<Primitive>,
    required: true,
  },

  /**
   * The choice values.
   *
   * @example
   * ```ts
   * [
   *   { value: 'foo', icon: 'phone', title: 'Call' },
   *   { value: 'bar', icon: 'mail', title: 'Email' },
   * ]
   * ```
   */
  choices: {
    type: Array as PropType<PUIIconGroupChoiceModel[]>,
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
   * Controls whether the icon switch displays tooltips.
   * When enabled, each choice's `label` appears as a tooltip on hover.
   * When disabled, each choice's `label` is shown in the HTML `title` attribute.
   *
   * @default false
   */
  showTooltips: {
    type: Boolean,
    default: false,
  },

  /**
   * Indicates whether the icon switch has errors.
   *
   * @default false
   */
  error: {
    type: Boolean,
    default: false,
  },

  /**
   * Indicates whether the icon switch is disabled.
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

defineEmits<{
  'update:modelValue': [value: Primitive]
}>()

const { listen } = puiTrigger()
const root = useTemplateRef('root')
const localChoices = ref<PUIIconGroupChoiceModel[]>([])
const focusVisible = ref(false)

let stop: (() => void) | undefined

/**
 * Updates the `localChoices` value when the `choices` change.
 */
watch(
  () => props.choices,
  (newChoices) => (localChoices.value = newChoices.map((choice) => (isObject(choice) ? choice : { value: choice }))),
  { immediate: true, deep: true },
)

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
.pui-icon-group {
  flex-shrink: 0;
  display: inline-flex;
  gap: 0.125rem;
  max-width: 100%;
  height: calc(2em + 0.25rem);
  padding: 0.125rem;
  overflow-x: auto;
  background-color: hsl(var(--pui-card));
  border: 1px solid hsl(var(--pui-input));
  border-radius: calc(var(--pui-radius) - 0.125rem);
  font-size: calc(1rem + var(--pui-size) * 0.125rem);
  transition: var(--pui-transition);
  transition-property: border-color, box-shadow;
}

.pui-icon-group-has-errors {
  --pui-ring: var(--pui-destructive);
  border-color: hsl(var(--pui-destructive));
}

.pui-icon-group:focus-visible,
.pui-icon-group-focus-visible {
  border-color: transparent;
  box-shadow: 0 0 0 0.125rem hsl(var(--pui-ring));
  outline: none;
}

.pui-icon-group-disabled {
  pointer-events: none;
}

.pui-icon-group-item {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  aspect-ratio: 1;
  cursor: pointer;
  border-radius: calc(var(--pui-radius) - 0.25rem);
  outline: none;
  color: hsl(var(--pui-foreground));
  transition: var(--pui-transition);
  transition-property: background-color, box-shadow, color;
}

.pui-icon-group-primary .pui-icon-group-item-active {
  background-color: hsl(var(--pui-primary));
  color: hsl(var(--pui-primary-foreground));
}

.pui-icon-group-primary .pui-icon-group-item:not(.pui-icon-group-item-active):hover {
  background-color: hsl(var(--pui-accent));
  color: hsl(var(--pui-accent-foreground));
}

.pui-icon-group-accent .pui-icon-group-item-active {
  background-color: hsl(var(--pui-accent));
  color: hsl(var(--pui-accent-foreground));
}

.pui-icon-group-accent .pui-icon-group-item:not(.pui-icon-group-item-active):hover {
  background-color: hsl(var(--pui-secondary));
  color: hsl(var(--pui-secondary-foreground));
}

.pui-icon-group-has-errors .pui-icon-group-item-active {
  background-color: hsl(var(--pui-destructive));
  color: hsl(var(--pui-destructive-foreground));
}

.pui-icon-group-disabled .pui-icon-group-item {
  color: hsl(var(--pui-muted-foreground) / 0.64);
  font-weight: 400;
}

.pui-icon-group-disabled .pui-icon-group-item-active {
  background-color: hsl(var(--pui-muted));
  color: hsl(var(--pui-muted-foreground));
}

.pui-icon-group-icon {
  width: 1em;
  height: 1em;
  font-size: calc(1em + 0.125rem);
}
</style>
