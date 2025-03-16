<template>
  <div class="pui-tabs" :style="{ '--pui-size': size }">
    <PUIButtonGroup
      v-if="choices.length > 1"
      :choices="choices"
      :id="listId"
      :modelValue="active"
      :variant="variant"
      @update:modelValue="
        (value) => {
          active = value as T
          $emit('change', value as T)
        }
      "
      class="pui-tabs-list"
    >
      <template #default="{ label, index }">
        <span>{{ label }}</span>
        <PUIBubble
          v-if="list[index]?.bubble"
          v-pui-tooltip="list[index].bubble?.tooltip"
          :variant="list[index].bubble?.variant"
        >
          {{ list[index].bubble.content }}
        </PUIBubble>
      </template>
    </PUIButtonGroup>
    <div class="pui-tabs-content" :style="{ minHeight: contentMinHeight ? `${contentMinHeight}px` : undefined }">
      <div ref="contentContainer">
        <slot />
      </div>
    </div>
  </div>
</template>

<script generic="T extends number | string" lang="ts" setup>
import { useElementSize } from '@vueuse/core'

export interface PUITabListItem<T extends number | string> {
  /**
   * Unique identifier for the tab item.
   * Can be either a number or string value.
   */
  name: T

  /**
   * Text content displayed as the tab label.
   * If not provided, the `name` property is used instead.
   */
  label?: string | Ref<string>

  /**
   * An optional bubble to display next to the tab label.
   */
  bubble?: {
    /**
     * The content of the bubble.
     */
    content: string | Ref<string>

    /**
     * Defines the visual style variant of the bubble.
     *
     * @default 'primary'
     */
    variant?: 'primary' | 'secondary' | 'accent' | 'destructive'

    /**
     * A tooltip to display when hovering over the bubble.
     */
    tooltip?: string
  }
}

const props = defineProps({
  /**
   * An array of tab labels.
   */
  list: {
    type: Array as PropType<PUITabListItem<T>[]>,
    required: true,
  },

  /**
   * The name of the active tab.
   * If not provided, the first tab in the list is selected.
   */
  active: {
    type: [Number, String] as unknown as PropType<T>,
  },

  /**
   * Defines the visual style variant of the tab buttons.
   *
   * @default 'accent'
   */
  variant: {
    type: String as PropType<'primary' | 'accent'>,
    default: 'accent',
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

defineEmits<{
  change: [id: T]
}>()

const listId = useId()
const active = ref<T | undefined>()
const choices = computed(() =>
  props.list.map(({ name, label }) => ({ label: unref(label) ?? String(name), value: name })),
)
const content = useTemplateRef('contentContainer')
const contentMinHeight = ref<number>()
const { height: contentContainerHeight } = useElementSize(content)

let contentMinHeightTimeout: NodeJS.Timeout | undefined

provide('active', active)

watch(
  () => [props.list, props.active],
  () => {
    active.value = (props.active as T) ?? props.list[0]?.name
  },
  { immediate: true },
)

watch(active, () => {
  setContentMinHeight(content.value?.offsetHeight)
})

watch(contentContainerHeight, () => {
  if (contentContainerHeight.value > 24) {
    setContentMinHeight(contentContainerHeight.value)
  }
})

onUnmounted(() => {
  clearTimeout(contentMinHeightTimeout)
})

function setContentMinHeight(minHeight: number | undefined) {
  clearTimeout(contentMinHeightTimeout)
  contentMinHeight.value = minHeight
  contentMinHeightTimeout = setTimeout(() => {
    contentMinHeight.value = undefined
  }, 250)
}
</script>

<style>
.pui-tabs-list.pui-button-group {
  width: 100%;
}

.pui-tabs-list .pui-button-group-item {
  flex-grow: 1;
  justify-content: center;
}

.pui-tabs-list .pui-bubble {
  border: none;
}

.pui-tabs-content:not(:first-child) {
  margin-top: 0.5em;
}
</style>
