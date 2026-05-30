<template>
  <PUIPopup
    :size="-1"
    :width="popupWidth"
    @close="close()"
    @overlayAnimated="focusSearchInput()"
    fullHeight="auto"
    ref="popup"
  >
    <template #header>
      <span class="p-title pui-row">
        <span class="pui-truncate">{{ __('pruvious-dashboard', 'Pick an icon') }}</span>
        <PUIButton
          :size="-2"
          :title="__('pruvious-dashboard', 'Close')"
          @click="close()"
          variant="ghost"
          class="pui-ml-auto"
        >
          <NuxtIcon mode="svg" name="tabler:x" />
        </PUIButton>
      </span>
    </template>

    <div class="p-icon-picker-search">
      <PUIInput
        v-model="searchValue"
        :placeholder="__('pruvious-dashboard', 'Search icons')"
        @blur="highlightedIcon = null"
        @focus="highlightedIcon = highlightedIcon ?? modelValue ?? filteredNames[0] ?? null"
        @keydown.down.prevent="moveHighlight(visibleColumns())"
        @keydown.enter="
          () => {
            if (highlightedIcon) {
              pickIcon(highlightedIcon)
            }
          }
        "
        @keydown.left.prevent="moveHighlight(-1)"
        @keydown.right.prevent="moveHighlight(1)"
        @keydown.up.prevent="moveHighlight(-visibleColumns())"
        autocomplete="off"
        name="p-icon-picker-search"
        ref="searchInput"
      />
      <PUIButton
        v-if="searchValue"
        :size="-3"
        :title="__('pruvious-dashboard', 'Clear')"
        @click.stop="
          () => {
            searchValue = ''
            focusSearchInput()
          }
        "
        tabindex="-1"
        variant="ghost"
      >
        <NuxtIcon height="1.125em" mode="svg" name="tabler:x" width="1.125em" />
      </PUIButton>
    </div>

    <div v-if="loading" class="p-icon-picker-empty pui-muted">
      {{ __('pruvious-dashboard', 'Loading...') }}
    </div>

    <div v-else-if="isEmpty(filteredNames)" class="p-icon-picker-empty pui-muted">
      {{
        isEmpty(searchValue)
          ? __('pruvious-dashboard', 'No icons available')
          : __('pruvious-dashboard', 'No icons found')
      }}
    </div>

    <div v-else :class="['p-icon-picker-grid', backgroundClass]">
      <div
        v-for="name of filteredNames"
        :key="name"
        class="p-icon-picker-item p-media-item-box"
        :class="{
          'p-media-item-selected': modelValue === name,
          'p-icon-picker-item-highlighted': highlightedIcon === name,
        }"
      >
        <button
          :title="name"
          @click="pickIcon(name)"
          @mouseenter="highlightedIcon = name"
          type="button"
          class="p-icon-picker-item-button pui-raw"
        >
          <img :alt="name" :src="iconUrl(name)" class="p-icon-picker-item-image" />
        </button>
        <span :title="name" class="p-icon-picker-item-label pui-truncate">{{ name }}</span>
      </div>
    </div>
  </PUIPopup>
</template>

<script lang="ts" setup>
import { Icon as NuxtIcon } from '#components'
import { __, buildIconUrl } from '#pruvious/app'
import { isEmpty, isString } from '@pruvious/utils'

interface IconsListResult {
  dir: string
  names: string[]
}

const props = defineProps({
  /**
   * The currently selected icon name. Used to highlight the active item in the grid.
   */
  modelValue: {
    type: String as PropType<string | null>,
    default: null,
  },

  /**
   * Directory containing the SVG icons. Relative to `<srcDir>`. When empty, the default
   * Pruvious icon directory is used.
   */
  dir: {
    type: String,
    default: '',
  },

  /**
   * Number of columns rendered in the icon grid.
   *
   * @default 6
   */
  columns: {
    type: Number,
    default: 6,
  },

  /**
   * Checkerboard background variant.
   *
   * @default 'auto'
   */
  background: {
    type: String as PropType<'light' | 'dark' | 'auto'>,
    default: 'auto',
  },
})

const backgroundClass = computed(() => `p-icon-bg-${props.background}`)

const emit = defineEmits<{
  close: [close: () => Promise<void>]
  pick: [name: string, close: () => Promise<void>]
}>()

defineExpose({ close })

const popup = useTemplateRef('popup')
const searchInput = useTemplateRef<{ input: HTMLInputElement | null }>('searchInput')
const runtimeConfig = useRuntimeConfig()
const apiBasePath = runtimeConfig.public.pruvious.apiBasePath
const prevFocus = document.activeElement as HTMLElement | null

const loading = ref(true)
const names = ref<string[]>([])
const searchValue = ref('')
const highlightedIcon = ref<string | null>(props.modelValue)

const popupWidth = computed(() => {
  const cellRem = 5
  const gapRem = 0.75
  const horizontalPaddingRem = 2
  const target = props.columns * cellRem + Math.max(0, props.columns - 1) * gapRem + horizontalPaddingRem
  return `min(${target}rem, calc(100vw - 2rem))`
})

const filteredNames = computed(() => {
  const query = searchValue.value.trim().toLowerCase()
  if (isEmpty(query)) {
    return names.value
  }
  return names.value.filter((name) => name.toLowerCase().includes(query))
})

watch(filteredNames, (next) => {
  if (isString(highlightedIcon.value) && next.includes(highlightedIcon.value)) {
    return
  }
  highlightedIcon.value = next[0] ?? null
})

function iconUrl(name: string) {
  return buildIconUrl(props.dir, name)
}

function focusSearchInput() {
  searchInput.value?.input?.focus()
}

function moveHighlight(delta: number) {
  if (isEmpty(filteredNames.value)) {
    return
  }
  const currentIndex = isString(highlightedIcon.value) ? filteredNames.value.indexOf(highlightedIcon.value) : -1
  const next = Math.max(0, Math.min(filteredNames.value.length - 1, currentIndex + delta))
  highlightedIcon.value = filteredNames.value[next] ?? null
}

function visibleColumns(): number {
  const grid = popup.value?.root?.querySelector('.p-icon-picker-grid') as HTMLElement | null
  if (!grid) {
    return props.columns
  }
  const templateColumns = getComputedStyle(grid).gridTemplateColumns
  const count = templateColumns.split(' ').filter(Boolean).length
  return count > 0 ? count : props.columns
}

function pickIcon(name: string) {
  emit('pick', name, closeWithFocus)
}

async function close() {
  emit('close', closeWithFocus)
}

async function closeWithFocus() {
  await popup.value!.close()
  setTimeout(() => prevFocus?.focus())
}

let loadController: AbortController | null = null

async function loadIcons() {
  loadController?.abort()
  const controller = new AbortController()
  loadController = controller
  loading.value = true
  try {
    const res = await $fetch<IconsListResult>(`${apiBasePath}pruvious/icons`, {
      query: isEmpty(props.dir) ? undefined : { dir: props.dir },
      signal: controller.signal,
    })
    if (controller.signal.aborted) {
      return
    }
    names.value = res.names
  } catch {
    if (!controller.signal.aborted) {
      names.value = []
    }
  } finally {
    if (loadController === controller) {
      loadController = null
      loading.value = false
    }
  }
}

watch(() => props.dir, loadIcons)

onMounted(() => {
  loadIcons()
})

onBeforeUnmount(() => {
  loadController?.abort()
})
</script>

<style scoped>
.p-title {
  font-weight: 500;
}

.p-icon-picker-search {
  position: relative;
}

.p-icon-picker-search :deep(.pui-input-control) {
  padding-right: calc(1.5rem + 0.5em);
}

.p-icon-picker-search :deep(.pui-button) {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  border-radius: calc(var(--pui-radius) - 0.25rem);
}

.p-icon-picker-empty {
  margin-top: 1rem;
  text-align: center;
}

.p-icon-picker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(5rem, 100%), 1fr));
  gap: 0.75rem;
  margin-top: 1rem;
}

.p-icon-picker-item {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.375rem;
  min-width: 0;
}

.p-icon-picker-item-button {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  width: 100%;
  aspect-ratio: 1 / 1;
  padding: 0.75rem;
  background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAA5SURBVHgB7dGxEQAgDELRxDHYfzVYIzoChYXnQf3vNTTJKWMAnKxWXV7AgC+APWdOKMnJckrAP8ENTFgK0Z64q28AAAAASUVORK5CYII=');
  background-color: hsl(var(--pui-background));
  border: 1px solid hsl(var(--pui-border));
  border-radius: var(--pui-radius);
  color: hsl(var(--pui-foreground));
  cursor: pointer;
  transition: var(--pui-transition);
  transition-property: background-color, border-color, box-shadow, color;
}

.dark .p-icon-bg-auto .p-icon-picker-item-button,
.p-icon-bg-dark .p-icon-picker-item-button {
  background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAA/SURBVHgB7dOhEQAgDAPAwGFrmAEGYP+dMB0AVoio6PUSnXuTS1v7PBBxv0wNHcERKDADONgHmE2qp1EElgQ/ufgHd9nZw0oAAAAASUVORK5CYII=');
}

.dark .p-icon-bg-light .p-icon-picker-item-button,
.p-icon-bg-light .p-icon-picker-item-button {
  background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAA5SURBVHgB7dGxEQAgDELRxDHYfzVYIzoChYXnQf3vNTTJKWMAnKxWXV7AgC+APWdOKMnJckrAP8ENTFgK0Z64q28AAAAASUVORK5CYII=');
}

.p-icon-picker-item-image {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  max-width: 1.75rem;
  max-height: 1.75rem;
  object-fit: contain;
}

.p-icon-picker-item-highlighted .p-icon-picker-item-button,
.p-icon-picker-item-button:focus-visible {
  box-shadow:
    0 0 0 0.125rem hsl(var(--pui-background)),
    0 0 0 0.25rem hsl(var(--pui-ring)),
    0 0 #0000;
  outline: 0.125rem solid transparent;
  outline-offset: 0.125rem;
}

.p-media-item-selected .p-icon-picker-item-button {
  border-color: hsl(var(--pui-accent));
}

.p-media-item-selected .p-icon-picker-item-label {
  color: hsl(var(--pui-foreground));
  font-weight: 500;
}

.p-icon-picker-item-label {
  display: block;
  width: 100%;
  text-align: center;
  font-size: 0.75rem;
  line-height: 1.25;
  color: hsl(var(--pui-muted-foreground));
}
</style>
