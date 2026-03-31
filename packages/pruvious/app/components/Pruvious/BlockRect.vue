<template>
  <PruviousBlockRectBase
    v-if="parentBlocksField"
    :deepest="deepest"
    :editable="editable"
    :el="el"
    :focused="focused"
    :highlighted="highlighted"
    :label="blockLabels[name] ?? name"
    :path="path"
    @mousedown.stop
  >
    <button
      :disabled="parentBlocksField.index >= parentBlocksField.fieldData.length - 1"
      :title="t.__$('pruvious-dashboard', dashboardLanguage, 'Move down')"
      @mousedown="onMove(1)"
      tabindex="-1"
      type="button"
    >
      <Icon mode="svg" name="tabler:chevron-down" />
    </button>

    <button
      :disabled="parentBlocksField.index < 1"
      :title="t.__$('pruvious-dashboard', dashboardLanguage, 'Move up')"
      @mousedown="onMove(-1)"
      tabindex="-1"
      type="button"
    >
      <Icon mode="svg" name="tabler:chevron-up" />
    </button>

    <button
      :disabled="!canHaveMoreSiblings"
      :title="t.__$('pruvious-dashboard', dashboardLanguage, 'Add after')"
      @mousedown.prevent="onAddAfter()"
      tabindex="-1"
      type="button"
    >
      <Icon mode="svg" name="tabler:arrow-bar-to-down" />
    </button>

    <button
      v-if="onlyBlocksField"
      :disabled="!canHaveMoreChildren"
      :title="t.__$('pruvious-dashboard', dashboardLanguage, 'Add inside')"
      @mousedown.prevent="onAddInside()"
      tabindex="-1"
      type="button"
    >
      <Icon mode="svg" name="tabler:circle-plus" />
    </button>

    <button
      :disabled="!canHaveMoreSiblings"
      :title="t.__$('pruvious-dashboard', dashboardLanguage, 'Add before')"
      @mousedown.prevent="onAddBefore()"
      tabindex="-1"
      type="button"
    >
      <Icon mode="svg" name="tabler:arrow-bar-to-up" />
    </button>

    <button
      :disabled="!canHaveMoreSiblings"
      :title="t.__$('pruvious-dashboard', dashboardLanguage, 'Duplicate')"
      @mousedown="onDuplicateBlock()"
      tabindex="-1"
      type="button"
    >
      <Icon mode="svg" name="tabler:copy" />
    </button>

    <button
      :title="t.__$('pruvious-dashboard', dashboardLanguage, 'Delete')"
      @mousedown="onDeleteBlock()"
      data-destructive
      tabindex="-1"
      type="button"
    >
      <Icon mode="svg" name="tabler:trash" />
    </button>
  </PruviousBlockRectBase>
</template>

<script lang="ts" setup>
import { i18n } from '#pruvious/app'
import { usePreview } from '#pruvious/dashboard'
import type { BlockName, SerializableBlock } from '#pruvious/server'

const props = defineProps({
  /**
   * The block name.
   */
  name: {
    type: String as PropType<BlockName>,
    required: true,
  },

  /**
   * The block options.
   */
  block: {
    type: Object as PropType<SerializableBlock>,
    required: true,
  },

  /**
   * The field path, expressed in dot notation, represents the exact location of the block within the current data structure.
   */
  path: {
    type: String,
    required: true,
  },

  /**
   * The HTML element to which the bounding preview rectangle will be aligned.
   */
  el: {
    type: Object as PropType<HTMLElement>,
    required: true,
  },

  /**
   * Specifies whether the container data can be modified.
   */
  editable: {
    type: Boolean,
    default: false,
  },

  /**
   * Indicates whether the block is currently highlighted in the preview.
   */
  highlighted: {
    type: Boolean,
    default: false,
  },

  /**
   * Indicates whether the block is currently focused in the preview.
   */
  focused: {
    type: Boolean,
    default: false,
  },

  /**
   * Indicates whether this block is the deepest in the list of preview rectangles.
   */
  deepest: {
    type: Boolean,
    default: false,
  },
})

const t = i18n()
const {
  dashboardLanguage,
  blockLabels,
  messageDashboard,
  resolveBlocksField,
  resolveParentBlocksField,
  moveBlock,
  duplicateBlock,
  deleteBlock,
  commitData,
  selectBlockAfterMutation,
  selectNearestBlock,
  deselectBlocks,
  rememberBlockSelection,
  rememberEditableFieldSelection,
} = usePreview()
const parentBlocksField = computed(() => resolveParentBlocksField(props.path))
const canHaveMoreSiblings = computed(() => parentBlocksField.value?.canHaveMoreChildren() ?? false)
const onlyBlocksField = computed(() => {
  const bfe = Object.entries(props.block.fields).filter(([_, { _fieldType }]) => _fieldType === 'blocks')
  return bfe.length === 1 ? resolveBlocksField(`${props.path}.${bfe[0]![0]}`) : null
})
const canHaveMoreChildren = computed(() => onlyBlocksField.value?.canHaveMoreChildren() ?? false)

function onMove(offset: number) {
  rememberBlockSelection()
  rememberEditableFieldSelection()

  const newBlockPath = moveBlock(props.path, offset)

  if (newBlockPath) {
    selectBlockAfterMutation(newBlockPath)
    commitData()
  }
}

function onDuplicateBlock() {
  rememberBlockSelection()
  rememberEditableFieldSelection()

  const duplicatedBlockPath = duplicateBlock(props.path)

  if (duplicatedBlockPath) {
    selectBlockAfterMutation(duplicatedBlockPath)
    commitData()
  }
}

function onDeleteBlock() {
  rememberBlockSelection()
  rememberEditableFieldSelection()

  const selectedBlock = selectNearestBlock(props.path) || deselectBlocks()
  const diff = deleteBlock(props.path)

  if (selectedBlock && diff[selectedBlock]) {
    selectBlockAfterMutation(diff[selectedBlock])
  }

  commitData()
}

function onAddBefore() {
  rememberBlockSelection()
  rememberEditableFieldSelection()
  messageDashboard('iframe:addBlock', { blockPath: props.path, position: 'before' })
}

function onAddInside() {
  rememberBlockSelection()
  rememberEditableFieldSelection()
  messageDashboard('iframe:addBlock', { blockPath: props.path, position: 'inside' })
}

function onAddAfter() {
  rememberBlockSelection()
  rememberEditableFieldSelection()
  messageDashboard('iframe:addBlock', { blockPath: props.path, position: 'after' })
}
</script>
