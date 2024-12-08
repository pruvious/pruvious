<template>
  <PruviousPopup :visible="visible" @hotkey="onHotkey" @update:visible="emit('update:visible', $event)">
    <template #header>
      <h2 class="truncate text-sm">{{ __('pruvious-dashboard', 'Add block') }}</h2>
    </template>

    <div v-if="blocks.length || isFiltered" class="p-4 pb-0">
      <component
        v-model="searchValue"
        :is="TextField"
        :options="{
          placeholder: __('pruvious-dashboard', 'Search blocks...'),
          clearable: true,
        }"
        @update:modelValue="filter()"
        class="w-full"
      />
    </div>

    <div class="grid gap-4 p-4 text-vs" :class="{ 'grid-cols-[repeat(auto-fill,minmax(8rem,1fr))]': blocks.length }">
      <button
        v-for="{ name, label, description, icon } of blocks"
        v-pruvious-tooltip="__('pruvious-dashboard', description)"
        @click="add(name)"
        data-ignore-autofocus
        type="button"
        class="flex aspect-square flex-col items-center justify-center gap-3 rounded-md border p-2 transition hocus:border-primary-700"
      >
        <span v-html="icon" class="h-5 w-5 shrink-0 text-gray-400"></span>
        <span class="clamp overflow-hidden overflow-ellipsis">{{ __('pruvious-dashboard', label) }}</span>
      </button>

      <button
        v-if="canPaste && !isFiltered"
        v-pruvious-tooltip="__('pruvious-dashboard', 'Paste block from clipboard')"
        @click="paste()"
        data-ignore-autofocus
        type="button"
        class="flex aspect-square flex-col items-center justify-center gap-3 rounded-md border border-dashed border-primary-300 p-2 text-primary-500 transition hocus:border-primary-700 hocus:text-primary-700"
      >
        <PruviousIconClipboard class="h-5 w-5 shrink-0" />
        <span class="clamp overflow-hidden overflow-ellipsis">{{ __('pruvious-dashboard', 'Paste') }}</span>
      </button>

      <p v-if="isFiltered && !blocks.length" class="text-sm text-gray-400">
        {{ __('pruvious-dashboard', 'No blocks found') }}
      </p>

      <p v-if="!isFiltered && !blocks.length" class="text-sm text-gray-400">
        {{ __('pruvious-dashboard', 'There are no compatible blocks that can be added to the selected slot') }}
      </p>
    </div>
  </PruviousPopup>
</template>

<script lang="ts" setup>
import { computed, ref, watch, type PropType } from '#imports'
import { type BlockName } from '#pruvious'
import { dashboardMiscComponent, textFieldComponent } from '#pruvious/dashboard'
import { usePruviousClipboard } from '../../composables/dashboard/clipboard'
import { usePruviousDashboard, type BlockMeta } from '../../composables/dashboard/dashboard'
import type { HotkeyAction } from '../../composables/dashboard/hotkeys'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { isDefined } from '../../utils/common'
import { BlockTree } from '../../utils/dashboard/block-tree'
import { BlockTreeItemSlot } from '../../utils/dashboard/block-tree-item-slot'
import { extractKeywords } from '../../utils/string'

export interface AddBlockOptions {
  treeOrSlot: BlockTree | BlockTreeItemSlot
  slot?: string
  index?: number
}

const props = defineProps({
  visible: {
    type: Boolean,
    required: true,
  },
  options: {
    type: Object as PropType<AddBlockOptions>,
  },
})

const emit = defineEmits<{
  'update:visible': [boolean]
  'updated': []
  'selected': [string]
  'pasteBlockAfter': [string]
}>()

const clipboard = usePruviousClipboard()
const dashboard = usePruviousDashboard()

const TextField = textFieldComponent()

const blocks = ref<BlockMeta[]>([])
const canPaste = computed(
  () =>
    clipboard.value?.pruviousClipboardType === 'block' &&
    getAllowedBlocks()?.includes(clipboard.value.payload.block.name),
)
const isFiltered = ref(false)
const searchValue = ref('')

const PruviousPopup = dashboardMiscComponent.Popup()

await loadTranslatableStrings('pruvious-dashboard')

watch(
  () => props.visible,
  () => {
    if (props.visible) {
      searchValue.value = ''
      filter()
    }
  },
)

function filter() {
  const keywords = extractKeywords(searchValue.value)
  const allowedBlocks = getAllowedBlocks()

  isFiltered.value = !!keywords.length

  blocks.value = Object.values(dashboard.value.blocks).filter(
    ({ name, label, description }) =>
      allowedBlocks?.includes(name) &&
      (!isFiltered.value ||
        keywords.some((keyword) => `${name} ${label} ${description}`.toLowerCase().includes(keyword))),
  )
}

function paste() {
  if (clipboard.value?.pruviousClipboardType === 'block') {
    const index = isDefined(props.options?.index) ? props.options!.index - 1 : '?'
    const key =
      props.options?.treeOrSlot instanceof BlockTree
        ? `${props.options.treeOrSlot.blocksField}.${index}`
        : props.options?.treeOrSlot instanceof BlockTreeItemSlot
        ? `${props.options.treeOrSlot.treeItem.key}.block.slots.${props.options.treeOrSlot.slotName}.${index}`
        : null

    if (key) {
      emit('pasteBlockAfter', key)
      emit('updated')
      emit('update:visible', false)
    }
  }
}

function add(name: BlockName) {
  if (props.options) {
    const key = props.options.treeOrSlot.addBlock(name, props.options.index)
    emit('updated')
    emit('update:visible', false)
    emit('selected', key)
  }
}

function getAllowedBlocks() {
  return props.options?.treeOrSlot instanceof BlockTree
    ? props.options.treeOrSlot.allowedRootBlocks
    : props.options?.treeOrSlot.allowedBlocks
}

function onHotkey(action: HotkeyAction) {
  if (action === 'close' || action === 'save') {
    emit('update:visible', false)
  }
}
</script>

<style scoped>
.clamp {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}
</style>
