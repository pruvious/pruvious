<template>
  <PUIIconGroup
    :choices="choices"
    :disabled="disabled"
    :id="id"
    :modelValue="value"
    :name="name"
    :size="size"
    :tooltips="tooltips"
    :variant="variant"
    @update:modelValue="change($event as PUIColorMode)"
  />
</template>

<script lang="ts" setup>
import type { PUIIconGroupChoiceModel } from './PUIIconGroup.vue'

export type PUIColorMode = 'system' | 'light' | 'dark'

const props = defineProps({
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
   * Controls whether the icon switch displays tooltips.
   * When enabled, each choice appears as a tooltip on hover.
   * When disabled, each choice is shown in the HTML `title` attribute.
   *
   * @default false
   */
  tooltips: {
    type: Boolean,
    default: false,
  },

  /**
   * Text to display in the `title` attribute of the light icon button.
   *
   * @default 'Light'
   */
  lightTitle: {
    type: String,
    default: 'Light',
  },

  /**
   * Text to display in the `title` attribute of the dark icon button.
   *
   * @default 'Dark'
   */
  darkTitle: {
    type: String,
    default: 'Dark',
  },

  /**
   * Text to display in the `title` attribute of the system icon button.
   *
   * @default 'System'
   */
  systemTitle: {
    type: String,
    default: 'System',
  },

  /**
   * Controls whether to include system-level color mode as a choice.
   *
   * @default false
   */
  withSystem: {
    type: Boolean,
    default: false,
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

const colorMode = useColorMode()
const value = ref<PUIColorMode>()
const choices = computed(() => [
  ...(props.withSystem ? [{ value: 'system', icon: 'device-desktop', title: props.systemTitle }] : []),
  { value: 'light', icon: 'sun', title: props.lightTitle },
  { value: 'dark', icon: 'moon', title: props.darkTitle },
]) as ComputedRef<PUIIconGroupChoiceModel[]>

let prefersColorScheme: MediaQueryList | undefined

onMounted(() => {
  prefersColorScheme = window.matchMedia('(prefers-color-scheme: dark)')
  prefersColorScheme.addEventListener('change', updateValue)
  watch(() => colorMode.preference, updateValue, { immediate: true })
})

onUnmounted(() => {
  prefersColorScheme?.removeEventListener('change', updateValue)
})

watch(() => props.withSystem, updateValue)

/**
 * Updates the color mode `value`.
 */
function updateValue() {
  let newValue = colorMode.preference as PUIColorMode

  if (!props.withSystem && colorMode.preference === 'system') {
    newValue = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  value.value = newValue
}

/**
 * Temporarily disables CSS transitions while switching the color `mode`.
 * This prevents unwanted visual effects during the theme change.
 */
function change(mode: PUIColorMode) {
  document.body.classList.add('pui-no-transition')
  colorMode.preference = mode
  setTimeout(() => document.body.classList.remove('pui-no-transition'), 150)
}
</script>
