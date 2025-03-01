<template>
  <div v-if="pages.length > 1" class="pui-pagination" :style="{ '--pui-size': size }">
    <div class="pui-pagination-buttons">
      <button
        :disabled="currentPage === 1"
        :title="previousPageTitle"
        @click="$emit('change', currentPage - 1)"
        type="button"
        class="pui-pagination-button pui-raw"
      >
        <Icon mode="svg" name="tabler:chevron-left" />
      </button>

      <template v-for="i of pages">
        <span v-if="i === '...'" class="pui-pagination-button pui-pagination-ellipsis">...</span>
        <button
          v-else
          :title="`${goToPageTitle} ${i}`"
          @click="currentPage !== i && $emit('change', i)"
          type="button"
          class="pui-pagination-button pui-raw"
          :class="{ 'pui-pagination-button-active': currentPage === i }"
        >
          {{ i }}
        </button>
      </template>

      <button
        :disabled="currentPage === lastPage"
        :title="nextPageTitle"
        @click="$emit('change', currentPage + 1)"
        class="pui-pagination-button pui-raw"
      >
        <Icon mode="svg" name="tabler:chevron-right" />
      </button>
    </div>

    <div class="pui-pagination-combo">
      <button
        :disabled="currentPage === 1"
        :title="previousPageTitle"
        @click="$emit('change', currentPage - 1)"
        type="button"
        class="pui-pagination-button pui-raw"
      >
        <Icon mode="svg" name="tabler:chevron-left" />
      </button>

      <PUINumber
        :choices="choices"
        :max="lastPage"
        :min="1"
        :modelValue="currentPage"
        @update:modelValue="$emit('change', $event)"
        autoWidth
        name="pui-pagination"
      />

      <button
        :disabled="currentPage === lastPage"
        :title="nextPageTitle"
        @click="$emit('change', currentPage + 1)"
        class="pui-pagination-button pui-raw"
      >
        <Icon mode="svg" name="tabler:chevron-right" />
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
const props = defineProps({
  /**
   * The current page number.
   */
  currentPage: {
    type: Number,
    required: true,
  },

  /**
   * The last page number.
   */
  lastPage: {
    type: Number,
    required: true,
  },

  /**
   * The text to display in the `title` attribute of the previous button.
   */
  previousPageTitle: {
    type: String,
    default: 'Previous',
  },

  /**
   * The text to display in the `title` attribute of the next button.
   */
  nextPageTitle: {
    type: String,
    default: 'Next',
  },

  /**
   * The text to display in the `title` attribute of the page number buttons.
   */
  goToPageTitle: {
    type: String,
    default: 'Go to page',
  },

  /**
   * The text to display before the page number in the combo box on small screens.
   */
  pageLabel: {
    type: String,
    default: 'Page',
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
  change: [page: number]
}>()

const pages = ref<(number | '...')[]>([])
const choices = computed(() =>
  Array.from({ length: props.lastPage }, (_, i) => ({ label: `${props.pageLabel} ${i + 1}`, value: i + 1 })),
)

watch(
  () => [props.currentPage, props.lastPage],
  () => {
    pages.value = []

    for (let i = Math.max(1, props.currentPage - 3); i <= Math.min(props.lastPage, props.currentPage + 3); i++) {
      pages.value.push(i)
    }

    if (props.lastPage > 0 && pages.value[0] !== 1) {
      if (props.currentPage - 4 > 1) {
        pages.value.unshift('...')
      }

      pages.value.unshift(1)
    }

    if (props.lastPage > 1 && pages.value[pages.value.length - 1] !== props.lastPage) {
      if (props.currentPage + 4 < props.lastPage) {
        pages.value.push('...')
      }

      pages.value.push(props.lastPage)
    }
  },
  { immediate: true },
)
</script>

<style>
.pui-pagination-buttons {
  display: flex;
  overflow-x: auto;
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--pui-foreground) / 0.25) transparent;
}

.pui-pagination-button {
  flex-shrink: 0;
  position: relative;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  min-width: calc(2em + 0.25rem);
  height: calc(2em + 0.25rem);
  padding: 0 0.75em;
  padding: 0 round(0.75em, 1px);
  overflow: hidden;
  background-color: hsl(var(--pui-background));
  border: 1px solid hsl(var(--pui-input));
  color: hsl(var(--pui-muted-foreground));
  font-size: calc(1rem + var(--pui-size) * 0.125rem);
  line-height: 1.5;
  white-space: nowrap;
  transition: var(--pui-transition);
  transition-property: background-color, border-color, color;
}

.pui-pagination-button:first-child {
  padding: 0;
  border-top-left-radius: calc(var(--pui-radius) - 0.125rem);
  border-bottom-left-radius: calc(var(--pui-radius) - 0.125rem);
}

.pui-pagination-button:last-child {
  padding: 0;
  border-top-right-radius: calc(var(--pui-radius) - 0.125rem);
  border-bottom-right-radius: calc(var(--pui-radius) - 0.125rem);
}

.pui-pagination-button:not(:first-child) {
  margin-left: -1px;
}

.pui-pagination-button:disabled {
  pointer-events: none;
  color: hsl(var(--pui-muted-foreground) / 0.64);
}

.pui-pagination-button:not(.pui-pagination-ellipsis):not(.pui-pagination-button-active):hover {
  background-color: hsl(var(--pui-secondary));
  color: hsl(var(--pui-secondary-foreground));
}

.pui-pagination-button-active {
  border-color: hsl(var(--pui-accent));
  background-color: hsl(var(--pui-accent));
  color: hsl(var(--pui-accent-foreground));
  font-weight: 500;
}

.pui-pagination-button-active + .pui-pagination-button {
  border-left-color: hsl(var(--pui-accent));
}

.pui-pagination-button:focus-visible {
  z-index: 1;
  box-shadow:
    0 0 0 0.125rem hsl(var(--pui-background)),
    0 0 0 0.25rem hsl(var(--pui-ring)),
    0 0 #0000;
  outline: 0.125rem solid transparent;
  outline-offset: 0.125rem;
}

.pui-pagination-button > svg {
  flex-shrink: 0;
  font-size: calc(1em + 0.25rem);
}

.pui-pagination-combo {
  display: none;
  align-items: center;
}

.pui-pagination-combo .pui-number {
  z-index: 1;
  margin-left: -1px;
  background-color: transparent;
  border-radius: 0;
}

.pui-pagination-combo .pui-number-input {
  padding: 0 1em;
}

.pui-pagination-combo > :focus {
  z-index: 2;
}

@media (max-width: 767px) {
  .pui-pagination-buttons {
    display: none;
  }

  .pui-pagination-combo {
    display: flex;
  }
}
</style>
