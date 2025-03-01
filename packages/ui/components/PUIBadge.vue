<template>
  <span
    ref="root"
    class="pui-badge"
    :style="{ '--pui-size': size, backgroundColor, 'color': color || (isDark ? 'white' : 'black') }"
  >
    <slot />
  </span>
</template>

<script lang="ts" setup>
import { isDefined } from '@pruvious/utils'

const props = defineProps({
  /**
   * The background color of the badge.
   * Accepts predefined UI color names or any valid CSS color value.
   *
   * @default primary
   */
  color: {
    type: String as PropType<'primary' | 'secondary' | 'accent' | 'destructive' | (string & {})>,
    default: 'primary',
  },

  /**
   * The text color of the badge.
   * If not provided, the text color is automatically determined based on the background color.
   */
  textColor: {
    type: String,
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
})

const root = useTemplateRef('root')
const backgroundColor = computed(() => {
  if (props.color === 'primary') return 'hsl(var(--pui-primary))'
  if (props.color === 'secondary') return 'hsl(var(--pui-secondary))'
  if (props.color === 'accent') return 'hsl(var(--pui-accent))'
  if (props.color === 'destructive') return 'hsl(var(--pui-destructive))'
  return props.color
})
const color = computed(() => {
  if (props.textColor) return props.textColor
  if (props.color === 'primary') return 'hsl(var(--pui-primary-foreground))'
  if (props.color === 'secondary') return 'hsl(var(--pui-secondary-foreground))'
  if (props.color === 'accent') return 'hsl(var(--pui-accent-foreground))'
  if (props.color === 'destructive') return 'hsl(var(--pui-destructive-foreground))'
})
const isDark = ref(false)

onMounted(() => {
  watch(
    () => props.color,
    () => {
      if (!color.value) {
        nextTick(() => {
          const backgroundColor = getComputedStyle(root.value!).getPropertyValue('background-color')
          const backgroundColorMatch = backgroundColor.match(/\d+/g)

          if (backgroundColorMatch) {
            const [r, g, b] = backgroundColorMatch.map(Number)

            if (isDefined(r) && isDefined(g) && isDefined(b)) {
              const rr = r / 255
              const gg = g / 255
              const bb = b / 255
              const rsRGB = rr <= 0.03928 ? rr / 12.92 : Math.pow((rr + 0.055) / 1.055, 2.4)
              const gsRGB = gg <= 0.03928 ? gg / 12.92 : Math.pow((gg + 0.055) / 1.055, 2.4)
              const bsRGB = bb <= 0.03928 ? bb / 12.92 : Math.pow((bb + 0.055) / 1.055, 2.4)
              const luminance = 0.2126 * rsRGB + 0.7152 * gsRGB + 0.0722 * bsRGB

              isDark.value = luminance < 0.5
            }
          }
        })
      }
    },
    { immediate: true },
  )
})
</script>

<style>
.pui-badge {
  flex-shrink: 0;
  display: inline-block;
  border-radius: calc(var(--pui-radius) - 0.125rem);
  padding: 0.125rem 0.5rem;
  font-size: calc(1rem + var(--pui-size) * 0.125rem - 0.0625rem);
  font-weight: 500;
}
</style>
