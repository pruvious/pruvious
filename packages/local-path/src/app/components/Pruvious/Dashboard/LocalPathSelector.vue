<template>
  <div>
    <div v-if="modelValue" class="pui-row">
      <PUIButton
        :disabled="disabled"
        :title="modelValue"
        @click="openFinderPopup()"
        variant="outline"
        class="pui-shrink"
      >
        <span class="pui-truncate">{{ modelValue }}</span>
      </PUIButton>

      <PUIButton
        v-pui-tooltip="__('pruvious-dashboard', 'Replace')"
        :disabled="disabled"
        @click="openFinderPopup()"
        variant="outline"
      >
        <Icon mode="svg" name="tabler:replace" />
      </PUIButton>

      <PUIButton
        v-pui-tooltip="__('pruvious-dashboard', 'Clear selection')"
        :disabled="disabled"
        @click="$emit('update:modelValue', '')"
        variant="outline"
      >
        <Icon mode="svg" name="tabler:x" />
      </PUIButton>
    </div>

    <PUIButton v-else :disabled="disabled" @click="openFinderPopup()" variant="outline" class="pui-shrink">
      <span class="pui-truncate">{{ resolvedSelectLabel }}</span>
    </PUIButton>

    <PUIPopup
      v-if="isFinderPopupVisible"
      :size="-1"
      @close="$event().then(() => (isFinderPopupVisible = false))"
      fullHeight="auto"
      ref="finderPopup"
      width="32rem"
    >
      <template #header>
        <div class="pui-row">
          <span class="pui-medium pui-truncate">
            {{ resolvedSelectLabel }}
          </span>

          <PUIButton
            v-if="canCreateDirectory && resolvedDir"
            v-pui-tooltip="__('pruvious-dashboard', 'New folder')"
            :size="-2"
            @click="isCreateDirectoryPopupVisible = true"
            variant="ghost"
            class="pui-ml-auto"
          >
            <Icon mode="svg" name="tabler:folder-plus" />
          </PUIButton>

          <PUIButton
            :size="-2"
            :title="__('pruvious-dashboard', 'Close')"
            @click="closeFinderPopup()"
            variant="ghost"
            :class="{ 'pui-ml-auto': !canCreateDirectory || !resolvedDir }"
          >
            <Icon mode="svg" name="tabler:x" />
          </PUIButton>
        </div>
      </template>

      <div v-if="response?.success">
        <div :title="resolvedDir" class="p-local-path-selector-current-dir">
          <span class="pui-truncate">
            {{ parentDir }}
          </span>
          <span class="pui-truncate">
            <span v-if="parentDir !== '/'">/</span>
            <span>{{ dirName }}</span>
          </span>
        </div>

        <div class="p-local-path-selector-items">
          <PUIButton
            v-if="parentDir"
            v-pui-tooltip="parentDir"
            @click="
              () => {
                if (parentDir) {
                  dir = parentDir
                }
              }
            "
            variant="outline"
            class="p-local-path-selector-item-button"
          >
            <Icon mode="svg" name="tabler:arrow-narrow-up" />
            <span>..</span>
          </PUIButton>

          <div v-for="file in visibleFiles" class="p-local-path-selector-group">
            <PUIButton
              v-if="file.type === 'directory' || selectionType !== 'directory'"
              :tabindex="file.type === 'file' ? -1 : 0"
              :variant="modelValue === file.path ? 'primary' : 'outline'"
              @click="
                () => {
                  if (file.type === 'directory') {
                    dir = file.path
                  }
                }
              "
              class="p-local-path-selector-item-button"
              :class="{ 'pui-pointer-events-none': file.type === 'file' }"
            >
              <Icon :name="file.type === 'directory' ? 'tabler:folder-open' : 'tabler:file'" mode="svg" />
              <span>{{ file.name }}</span>
            </PUIButton>

            <PUIButton
              v-if="modelValue !== file.path && (selectionType === 'any' || selectionType === file.type)"
              v-pui-tooltip="__('pruvious-dashboard', file.type === 'file' ? 'Select file' : 'Select directory')"
              @click="
                () => {
                  $emit('update:modelValue', file.path)
                  closeFinderPopup()
                }
              "
              variant="primary"
              class="p-local-path-selector-select-button"
            >
              <Icon mode="svg" name="tabler:check" />
            </PUIButton>
          </div>
        </div>
      </div>

      <p v-else-if="response" class="pui-muted">
        {{ response.error }}
      </p>

      <template #footer>
        <div class="pui-row">
          <PUIButton @click="closeFinderPopup()" variant="outline" class="pui-ml-auto">
            {{ __('pruvious-dashboard', 'Close') }}
          </PUIButton>
        </div>
      </template>
    </PUIPopup>

    <PruviousDashboardCreateLocalDirectoryPopup
      v-if="canCreateDirectory && isCreateDirectoryPopupVisible && resolvedDir"
      :parentDir="resolvedDir"
      @close="$event().then(() => (isCreateDirectoryPopupVisible = false))"
      @created="onDirectoryCreated"
    />
  </div>
</template>

<script lang="ts" setup>
import { $pfetch, __, type PruviousFetchError } from '#pruvious/app'
import { collator, isString } from '@pruvious/utils'
import { basename, dirname } from 'pathe'
import type { LocalPathFile } from '../../../../modules/pruvious-local-path/types'

const props = defineProps({
  /**
   * The current selected local path.
   */
  modelValue: {
    type: String,
    required: true,
  },

  /**
   * Defines the type of items the user is allowed to select.
   *
   * @default 'any'
   */
  selectionType: {
    type: String as PropType<'any' | 'file' | 'directory'>,
    default: 'any',
  },

  /**
   * The directory to display when the finder popup first opens.
   *
   * Supports absolute paths, relative paths, or `~` (user home directory).
   * If not provided, defaults to the server working directory.
   *
   * @example
   * ```ts
   * '/absolute/path/to/directory'
   * '../relative/path/to/directory'
   * '~/path/to/directory'
   * ```
   */
  initialDirectory: {
    type: String,
  },

  /**
   * The label for the select button.
   *
   * If not provided, a default label will be used depending on the `selectionType` prop value:
   *
   * - `any`: __('pruvious-dashboard', 'Select path')
   * - `file`: __('pruvious-dashboard', 'Select file')
   * - `directory`: __('pruvious-dashboard', 'Select directory')
   */
  selectLabel: {
    type: String,
  },

  /**
   * Controls whether the UI is disabled.
   *
   * @default false
   */
  disabled: {
    type: Boolean,
    default: false,
  },

  /**
   * When `true`, the finder popup gets a "New folder" button that opens a popup
   * to create a directory inside the currently displayed parent.
   *
   * @default false
   */
  canCreateDirectory: {
    type: Boolean,
    default: false,
  },

  /**
   * Whether to list dotfiles (entries whose name starts with `.`, such as `.git`
   * or `.env`) in the finder popup.
   *
   * @default false
   */
  showHiddenFiles: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const finderPopup = useTemplateRef('finderPopup')
const isFinderPopupVisible = ref(false)
const isCreateDirectoryPopupVisible = ref(false)
const dir = ref(props.initialDirectory)
const resolvedDir = computed(() => {
  if (response.value?.success && response.value.data.length) {
    const parent = dirname(response.value.data[0]!.path)
    return parent === '.' ? '/' : parent
  }
  return dir.value
})
const parentDir = computed(() => {
  if (resolvedDir.value) {
    const parent = dirname(resolvedDir.value)
    if (parent !== '.' && parent !== resolvedDir.value) {
      return parent
    }
  }
  return null
})
const dirName = computed(() => (resolvedDir.value ? basename(resolvedDir.value) : ''))
const response = ref<{ success: true; data: LocalPathFile[] } | { success: false; error: string }>()
const visibleFiles = computed(() => {
  if (!response.value?.success) {
    return []
  }
  return props.showHiddenFiles ? response.value.data : response.value.data.filter((file) => !file.name.startsWith('.'))
})
const resolvedSelectLabel = computed(() => {
  if (props.selectLabel) {
    return props.selectLabel
  } else if (props.selectionType === 'file') {
    return __('pruvious-dashboard', 'Select file')
  } else if (props.selectionType === 'directory') {
    return __('pruvious-dashboard', 'Select directory')
  }
  return __('pruvious-dashboard', 'Select path')
})

watch(
  () => props.modelValue,
  (value) => {
    if (value) {
      const parent = dirname(value)
      dir.value = parent === '.' ? '/' : parent
    }
  },
  { immediate: true },
)

watch(dir, refreshData)

async function refreshData() {
  const _response = await $pfetch('/api/local-path', { query: { dir: dir.value } })
    .then((files) =>
      files.sort((a, b) => {
        if (a.type === b.type) {
          return collator.compare(a.name, b.name)
        }
        return a.type === 'directory' ? -1 : 1
      }),
    )
    .catch((error: PruviousFetchError) => error.message)

  response.value = isString(_response) ? { success: false, error: _response } : { success: true, data: _response }
}

async function openFinderPopup() {
  await refreshData()
  isFinderPopupVisible.value = true
}

function closeFinderPopup() {
  finderPopup.value?.close().then(() => (isFinderPopupVisible.value = false))
}

async function onDirectoryCreated(_path: string) {
  await refreshData()
}
</script>

<style scoped>
.p-local-path-selector-current-dir {
  position: sticky;
  z-index: 1;
  top: 0;
  display: flex;
  margin: -0.5rem -0.75rem 0.25rem;
  padding: 0.375rem 0.75rem;
  background-color: hsl(var(--pui-background));
  color: hsl(var(--pui-muted-foreground));
  font-family: var(--pui-font-mono);
  font-size: 0.75rem;
  font-weight: 500;
}

.p-local-path-selector-current-dir span:last-child {
  flex-shrink: 0;
}

.p-local-path-selector-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.p-local-path-selector-group {
  display: flex;
  gap: 0.5rem;
}

.p-local-path-selector-group:empty {
  display: none;
}

.p-local-path-selector-item-button {
  flex-grow: 1;
  justify-content: flex-start;
}

.p-local-path-selector-select-button {
  display: none;
}

.p-local-path-selector-group:hover .p-local-path-selector-select-button,
.p-local-path-selector-group:focus-within .p-local-path-selector-select-button {
  display: inline-flex;
}
</style>
