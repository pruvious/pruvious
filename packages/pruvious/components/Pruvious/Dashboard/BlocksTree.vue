<template>
  <div class="p-blocks-tree-wrapper">
    <PUITree
      v-if="tree.length"
      v-model="tree"
      :highlightedItem="highlightedBlock"
      :selectedItems="selectedBlocks"
      @copyItems="
        (items, event) => {
          event.preventDefault()
          const data = retractExtendedBlocksValue(items.map(({ source }) => source))
          clipboard.copy({ pruviousClipboardDataType: 'blocks', data })
          puiToast(__('pruvious-dashboard', 'Copied'), { type: 'success' })
        }
      "
      @cutItems="
        (items, event) => {
          if (!disabled) {
            const data = retractExtendedBlocksValue(items.map(({ source }) => source))
            clipboard.copy({ pruviousClipboardDataType: 'blocks', data })
            puiToast(__('pruvious-dashboard', 'Copied'), { type: 'success' })
            deleteItems(items, event)
          }
        }
      "
      @deleteItems="deleteItems"
      @dropItems="dropItems"
      @duplicateItems="
        (items, event) => {
          if (items.every((item) => canHaveSiblings(item.source))) {
            duplicateItems(items, event)
          }
        }
      "
      @moveDownItems="(items, event) => moveItems('down', items, event)"
      @moveUpItems="(items, event) => moveItems('up', items, event)"
      @update:highlightedItem="$emit('update:highlightedBlock', $event)"
      @update:modelValue="
        () => {
          if (!disabled) {
            Object.assign(
              expandedItems,
              Object.fromEntries(treeComponent!.flatItems().map((item) => [item.id, !!(item as any).expanded])),
            )
            emitValue()
          }
        }
      "
      @update:selectedItems="$emit('update:selectedBlocks', $event)"
      ref="treeComponent"
      class="p-blocks-tree"
    >
      <template #item-label="{ item }">
        <span v-if="!item.source.$virtualSlotName" :data-path="item.source.$path" class="p-blocks-tree-item">
          <span :title="item.label" class="pui-truncate">
            {{ item.label }}
          </span>

          <span
            v-if="itemErrors[item.source.$path] || (typeof localErrors === 'object' && localErrors[item.source.$path])"
            class="pui-shrink-0 pui-row pui-mr-auto"
          >
            <PUIBubble
              v-if="itemErrors[item.source.$path]"
              v-pui-tooltip="
                __('pruvious-dashboard', 'Found $count $errors', { count: itemErrors[item.source.$path]! })
              "
              variant="destructive"
              class="pui-border-none"
            >
              {{ itemErrors[item.source.$path] }}
            </PUIBubble>

            <PUIBubble
              v-if="typeof localErrors === 'object' && localErrors[item.source.$path]"
              v-pui-tooltip="localErrors[item.source.$path]"
              variant="destructive"
              class="pui-border-none"
            >
              !
            </PUIBubble>
          </span>

          <span
            v-if="!disabled"
            @click="
              ($event) => {
                if (selectedBlocks.length > 1) {
                  $event.stopPropagation()
                }
              }
            "
            class="p-blocks-tree-item-actions"
            :class="{ 'p-blocks-tree-item-actions-visible': visibleActions?.id === item.id }"
          >
            <PUIButton
              v-if="
                item.nestable &&
                (item.source.$virtualSlotName || Object.keys(item.source.$nestedBlocksFields).length === 1) &&
                canHaveChildren(item.source)
              "
              :size="-3"
              :title="__('pruvious-dashboard', 'Add nested block')"
              @click="
                () => {
                  const nestedBlocksField = getNestedBlocksField(item.source)!
                  const parent = item.source
                  const pathPrefix = `${parent.$path}.${Object.keys(parent.$nestedBlocksFields)[0]}`
                  const index = parent.$children.length
                  const _allowedBlocks = nestedBlocksField.$allowedBlocks
                  if (_allowedBlocks.length > 1) {
                    addBlockPopup = { parent, index, pathPrefix, allowedBlocks: _allowedBlocks }
                  } else {
                    addBlock(_allowedBlocks[0]!, parent, index, pathPrefix)
                  }
                  emitValue()
                  $emit('queueConditionalLogicUpdate', '$reset')
                }
              "
              variant="ghost"
            >
              <Icon mode="svg" name="tabler:plus" />
            </PUIButton>

            <PUIButton
              v-if="selectedBlocks.length < 2 || treeComponent?.selectedItemIds[item.id]"
              :ref="(el) => (actionButtons[item.id] = el)"
              :size="-3"
              :title="__('pruvious-dashboard', 'Actions')"
              :variant="visibleActions?.id === item.id ? 'primary' : 'ghost'"
              @click="visibleActions = visibleActions?.id === item.id ? null : item"
            >
              <Icon mode="svg" name="tabler:dots" />
            </PUIButton>
          </span>
        </span>

        <span v-else :data-path="item.source.$path" class="p-blocks-tree-item-slot">
          <span :title="item.label" class="pui-truncate">
            {{ item.label }}
          </span>

          <span
            v-if="itemErrors[item.source.$path] || (typeof localErrors === 'object' && localErrors[item.source.$path])"
            class="pui-shrink-0 pui-row pui-mr-auto"
          >
            <PUIBubble
              v-if="itemErrors[item.source.$path]"
              v-pui-tooltip="
                __('pruvious-dashboard', 'Found $count $errors', { count: itemErrors[item.source.$path]! })
              "
              variant="destructive"
              class="pui-border-none"
            >
              {{ itemErrors[item.source.$path] }}
            </PUIBubble>

            <PUIBubble
              v-if="typeof localErrors === 'object' && localErrors[item.source.$path]"
              v-pui-tooltip="localErrors[item.source.$path]"
              variant="destructive"
              class="pui-border-none"
            >
              !
            </PUIBubble>
          </span>

          <span
            v-if="
              !disabled &&
              item.nestable &&
              (item.source.$virtualSlotName || Object.keys(item.source.$nestedBlocksFields).length === 1) &&
              canHaveChildren(item.source)
            "
            @click="
              ($event) => {
                if (selectedBlocks.length > 1) {
                  $event.stopPropagation()
                }
              }
            "
            class="p-blocks-tree-item-actions"
            :class="{ 'p-blocks-tree-item-actions-visible': visibleActions?.id === item.id }"
          >
            <PUIButton
              :size="-3"
              :title="__('pruvious-dashboard', 'Add nested block')"
              @click="
                () => {
                  const nestedBlocksField = getNestedBlocksField(item.source)!
                  const parent = item.source
                  const pathPrefix = parent.$path
                  const index = parent.$children.length
                  const _allowedBlocks = nestedBlocksField.$allowedBlocks
                  if (_allowedBlocks.length > 1) {
                    addBlockPopup = { parent, index, pathPrefix, allowedBlocks: _allowedBlocks }
                  } else {
                    addBlock(_allowedBlocks[0]!, parent, index, pathPrefix)
                  }
                  emitValue()
                  $emit('queueConditionalLogicUpdate', '$reset')
                }
              "
              variant="ghost"
            >
              <Icon mode="svg" name="tabler:plus" />
            </PUIButton>
          </span>
        </span>
      </template>

      <template #item-icon="{ item }">
        <Icon
          :name="`tabler:${item.selectable === false ? 'stack' : dashboard!.blocks[item.source.$key]?.ui.icon}`"
          mode="svg"
        />
      </template>
    </PUITree>

    <span v-else class="p-blocks-tree-empty">{{ __('pruvious-dashboard', 'No blocks added') }}</span>

    <PUIDropdown
      v-if="visibleActions"
      :reference="actionButtons?.[visibleActions.id]?.$el"
      :restoreFocus="false"
      @click="visibleActions = null"
      @close="visibleActions = null"
      placement="end"
    >
      <PUIDropdownItem
        v-if="selectedBlocks.length === 1 && canHaveSiblings(selectedBlocks[0]!.source)"
        :title="__('pruvious-dashboard', 'Add before')"
        @click="
          () => {
            const nestedBlocksField = getParentNestedBlocksField(selectedBlocks[0]!.source)
            const parent = selectedBlocks[0]!.source.$parent
            const { $children } = getParentLists(selectedBlocks[0]!.source)
            const pathPrefix = selectedBlocks[0]!.source.$path.split('.').slice(0, -1).join('.')
            const index = $children.indexOf(toRaw(selectedBlocks[0]!.source))
            const _allowedBlocks = nestedBlocksField?.$allowedBlocks ?? allowedBlocks
            if (_allowedBlocks.length > 1) {
              addBlockPopup = { parent, index, pathPrefix, allowedBlocks: _allowedBlocks }
            } else {
              addBlock(_allowedBlocks[0]!, parent, index, pathPrefix)
            }
            emitValue()
            $emit('queueConditionalLogicUpdate', '$reset')
          }
        "
      >
        <Icon mode="svg" name="tabler:arrow-bar-to-up" />
        <span>{{ __('pruvious-dashboard', 'Add before') }}</span>
      </PUIDropdownItem>

      <PUIDropdownItem
        v-if="
          selectedBlocks.length === 1 &&
          selectedBlocks[0]!.nestable &&
          (selectedBlocks[0]!.source.$virtualSlotName ||
            Object.keys(selectedBlocks[0]!.source.$nestedBlocksFields).length === 1) &&
          canHaveChildren(selectedBlocks[0]!.source)
        "
        :title="__('pruvious-dashboard', 'Add inside')"
        @click="
          () => {
            const nestedBlocksField = getNestedBlocksField(selectedBlocks[0]!.source)!
            const parent = selectedBlocks[0]!.source
            const pathPrefix = `${parent.$path}.${parent.$virtualSlotName ?? Object.keys(parent.$nestedBlocksFields)[0]}`
            const index = parent.$children.length
            const _allowedBlocks = nestedBlocksField.$allowedBlocks
            if (_allowedBlocks.length > 1) {
              addBlockPopup = { parent, index, pathPrefix, allowedBlocks: _allowedBlocks }
            } else {
              addBlock(_allowedBlocks[0]!, parent, index, pathPrefix)
            }
            emitValue()
            $emit('queueConditionalLogicUpdate', '$reset')
          }
        "
      >
        <Icon mode="svg" name="tabler:circle-plus" />
        <span>{{ __('pruvious-dashboard', 'Add inside') }}</span>
      </PUIDropdownItem>

      <PUIDropdownItem
        v-if="selectedBlocks.length === 1 && canHaveSiblings(selectedBlocks[0]!.source)"
        :title="__('pruvious-dashboard', 'Add after')"
        @click="
          () => {
            const nestedBlocksField = getParentNestedBlocksField(selectedBlocks[0]!.source)
            const parent = selectedBlocks[0]!.source.$parent
            const { $children } = getParentLists(selectedBlocks[0]!.source)
            const pathPrefix = selectedBlocks[0]!.source.$path.split('.').slice(0, -1).join('.')
            const index = $children.indexOf(toRaw(selectedBlocks[0]!.source)) + 1
            const _allowedBlocks = nestedBlocksField?.$allowedBlocks ?? allowedBlocks
            if (_allowedBlocks.length > 1) {
              addBlockPopup = { parent, index, pathPrefix, allowedBlocks: _allowedBlocks }
            } else {
              addBlock(_allowedBlocks[0]!, parent, index, pathPrefix)
            }
            emitValue()
            $emit('queueConditionalLogicUpdate', '$reset')
          }
        "
      >
        <Icon mode="svg" name="tabler:arrow-bar-to-down" />
        <span>{{ __('pruvious-dashboard', 'Add after') }}</span>
      </PUIDropdownItem>

      <hr />

      <PUIDropdownItem
        :title="__('pruvious-dashboard', 'Copy')"
        @click="
          () => {
            const data = retractExtendedBlocksValue(selectedBlocks.map(({ source }) => source))
            clipboard.copy({ pruviousClipboardDataType: 'blocks', data })
            puiToast(__('pruvious-dashboard', 'Copied'), { type: 'success' })
          }
        "
      >
        <Icon mode="svg" name="tabler:clipboard" />
        <span>{{ __('pruvious-dashboard', 'Copy') }}</span>
      </PUIDropdownItem>

      <PUIDropdownItem
        v-if="!disabled"
        :title="__('pruvious-dashboard', 'Cut')"
        @click="
          () => {
            const data = retractExtendedBlocksValue(selectedBlocks.map(({ source }) => source))
            clipboard.copy({ pruviousClipboardDataType: 'blocks', data })
            puiToast(__('pruvious-dashboard', 'Copied'), { type: 'success' })
            deleteItems(selectedBlocks)
          }
        "
      >
        <Icon mode="svg" name="tabler:cut" />
        <span>{{ __('pruvious-dashboard', 'Cut') }}</span>
      </PUIDropdownItem>

      <PUIDropdownItem
        v-if="
          !disabled &&
          clipboardData?.pruviousClipboardDataType === 'blocks' &&
          selectedBlocks.every((item) => canHaveSiblings(item.source))
        "
        :title="__('pruvious-dashboard', 'Paste before')"
        @click="pasteItems(clipboardData.data, selectedBlocks, 'before')"
      >
        <Icon mode="svg" name="tabler:clipboard-plus" />
        <span>{{ __('pruvious-dashboard', 'Paste before') }}</span>
      </PUIDropdownItem>

      <PUIDropdownItem
        v-if="
          !disabled &&
          clipboardData?.pruviousClipboardDataType === 'blocks' &&
          selectedBlocks.every((item) => canHaveChildren(item.source))
        "
        :title="__('pruvious-dashboard', 'Paste inside')"
        @click="pasteItems(clipboardData.data, selectedBlocks)"
      >
        <Icon mode="svg" name="tabler:clipboard-plus" />
        <span>{{ __('pruvious-dashboard', 'Paste inside') }}</span>
      </PUIDropdownItem>

      <PUIDropdownItem
        v-if="
          !disabled &&
          clipboardData?.pruviousClipboardDataType === 'blocks' &&
          selectedBlocks.every((item) => canHaveSiblings(item.source))
        "
        :title="__('pruvious-dashboard', 'Paste after')"
        @click="pasteItems(clipboardData.data, selectedBlocks, 'after')"
      >
        <Icon mode="svg" name="tabler:clipboard-plus" />
        <span>{{ __('pruvious-dashboard', 'Paste after') }}</span>
      </PUIDropdownItem>

      <hr />

      <PUIDropdownItem
        v-if="selectedBlocks.every((item) => canHaveSiblings(item.source))"
        :title="__('pruvious-dashboard', 'Duplicate')"
        @click="duplicateItems(selectedBlocks)"
      >
        <Icon mode="svg" name="tabler:copy" />
        <span>{{ __('pruvious-dashboard', 'Duplicate') }}</span>
      </PUIDropdownItem>

      <PUIDropdownItem :title="__('pruvious-dashboard', 'Delete')" @click="deleteItems(selectedBlocks)" destructive>
        <Icon mode="svg" name="tabler:trash" />
        <span>{{ __('pruvious-dashboard', 'Delete') }}</span>
      </PUIDropdownItem>
    </PUIDropdown>

    <Teleport v-if="addBlockContainer && !disabled && allowedBlocks.length" :to="addBlockContainer">
      <div data-panel="1" class="pui-row">
        <PUIButton
          v-if="typeof localErrors === 'object' && localErrors[props.fieldName]"
          v-pui-tooltip="localErrors[props.fieldName]"
          variant="destructive"
          class="p-blocks-tree-error-button"
        >
          <Icon mode="svg" name="tabler:exclamation-circle" />
        </PUIButton>

        <PUIButton
          v-pui-tooltip="__('pruvious-dashboard', 'Add top-level block')"
          :disabled="
            disabled ||
            !allowedBlocks.length ||
            (fieldOptions.maxItems !== false && extendedModelValue.length >= (fieldOptions.maxItems as number))
          "
          @click="
            () => {
              if (allowedBlocks.length > 1) {
                addBlockPopup = { parent: null, index: extendedModelValue.length, pathPrefix: fieldName, allowedBlocks }
              } else {
                addBlock(allowedBlocks[0]!, null, extendedModelValue.length, fieldName)
              }
            }
          "
          variant="outline"
          class="p-blocks-tree-add-button"
        >
          <Icon mode="svg" name="tabler:cube-plus" />
        </PUIButton>
      </div>
    </Teleport>

    <PruviousDashboardBlockPickerPopup
      v-if="addBlockPopup"
      :allowedBlocks="addBlockPopup.allowedBlocks"
      @close="$event().then(() => (addBlockPopup = null))"
      @pick="
        (blockName, close) => {
          addBlock(blockName, addBlockPopup!.parent, addBlockPopup!.index, addBlockPopup!.pathPrefix)
          close().then(() => (addBlockPopup = null))
        }
      "
    />
  </div>
</template>

<script lang="ts" setup>
import {
  __,
  maybeTranslate,
  parseConditionalLogic,
  resolveFieldLabel,
  usePruviousClipboard,
  usePruviousClipboardData,
  usePruviousDashboard,
  type PruviousClipboardData,
} from '#pruvious/client'
import type {
  BlockGroupName,
  BlockName,
  BlockTagName,
  GenericSerializableFieldOptions,
  SerializableBlock,
  SerializableFieldOptions,
} from '#pruvious/server'
import type { ConditionalLogicResolver } from '@pruvious/orm'
import type { PUITreeDropTarget, PUITreeItemModel } from '@pruvious/ui/components/PUITreeItem.vue'
import { usePUIHotkeys } from '@pruvious/ui/pui/hotkeys'
import { puiToast } from '@pruvious/ui/pui/toast'
import {
  puiDeleteTreeItems,
  puiDropTreeItems,
  puiMoveTreeItems,
  puiTree,
  type PUITreeMapper,
} from '@pruvious/ui/pui/tree'
import {
  deepClone,
  isArray,
  isDefined,
  isEmpty,
  isObject,
  isStringInteger,
  nanoid,
  omit,
  remap,
  setProperty,
  sortNaturallyByProp,
  titleCase,
  uniqueArray,
} from '@pruvious/utils'
import { useDebounceFn, useEventListener, useWebWorkerFn, watchDebounced } from '@vueuse/core'

type BlockValue = { $key: BlockName } & Record<string, any>

export type ExtendedBlockValue = {
  $id: string
  $path: string
  $parent: ExtendedBlockValue | null
  $children: ExtendedBlockValue[]
  $nestedBlocksFields: Record<string, NestedBlocksField>
  $virtualSlotName: string | null
} & Record<string, any>

export type NestedBlocksField = {
  $allowRootBlocks: BlockName[]
  $denyRootBlocks: BlockName[]
  $allowNestedBlocks: BlockName[]
  $denyNestedBlocks: BlockName[]
  $allowedBlocks: BlockName[]
} & SerializableFieldOptions<'blocks'>

const props = defineProps({
  /**
   * A `blocks` field value (array of block objects).
   */
  modelValue: {
    type: Object as PropType<BlockValue[]>,
    required: true,
  },

  /**
   * The current record data from a collection or singleton.
   * Contains key-value pairs representing the record's fields and their values.
   */
  data: {
    type: Object as PropType<Record<string, any>>,
    required: true,
  },

  /**
   * A key-value pair of (sub)field names and their combined options defined in a collection, singleton, block, or field.
   */
  fields: {
    type: Object as PropType<Record<string, GenericSerializableFieldOptions>>,
    required: true,
  },

  /**
   * The current top-level `blocksField({})` name.
   */
  fieldName: {
    type: String,
    required: true,
  },

  /**
   * The combined field options defined in a collection, singleton, or block.
   */
  fieldOptions: {
    type: Object as PropType<SerializableFieldOptions<'blocks'>>,
    required: true,
  },

  /**
   * Controls whether the tree is disabled.
   */
  disabled: {
    type: Boolean,
    required: true,
  },

  /**
   * A resolver instance that handles conditional logic evaluation for `fields` and their associated `data`.
   * This resolver determines field visibility, validation rules, and other dynamic behaviors based on defined conditions.
   */
  conditionalLogicResolver: {
    type: Object as PropType<ConditionalLogicResolver>,
    required: true,
  },

  /**
   * Stores the evaluation results of conditional logic for form fields.
   * The object uses dot-notation field paths as keys (e.g. `repeater.0.field`) and boolean values indicating if the condition is met.
   */
  conditionalLogic: {
    type: Object as PropType<Record<string, boolean>>,
    required: true,
  },

  /**
   * Represents a key-value object of error messages that can be displayed to the user.
   * Keys are (sub)field paths in dot notation (e.g. `repeater.0.field`) and values are error messages.
   */
  errors: {
    type: Object as PropType<Record<string, string>>,
    required: true,
  },

  /**
   * The container element to which the "Add top-level block" button will be teleported.
   */
  addBlockContainer: {
    type: [Object, null] as PropType<HTMLElement | null>,
    required: true,
  },

  /**
   * The currently selected blocks (items) in the tree.
   */
  selectedBlocks: {
    type: Array as PropType<PUITreeItemModel<ExtendedBlockValue>[]>,
    default: () => [],
  },

  /**
   * The currently highlighted block (item) in the tree.
   */
  highlightedBlock: {
    type: [Object, undefined] as PropType<PUITreeItemModel<ExtendedBlockValue> | undefined>,
  },
})

const emit = defineEmits<{
  'commit': [value: BlockValue[]]
  'update:modelValue': [value: BlockValue[]]
  'queueConditionalLogicUpdate': [path: '$reset']
  'update:selectedBlocks': [value: PUITreeItemModel<ExtendedBlockValue>[]]
  'update:highlightedBlock': [value: PUITreeItemModel<ExtendedBlockValue> | undefined]
}>()

defineExpose({
  updateTreePlaceholder,
})

const dashboard = usePruviousDashboard()
const clipboard = usePruviousClipboard()
const clipboardData = usePruviousClipboardData()
const treeComponent = useTemplateRef('treeComponent')
const treeMapper: PUITreeMapper<ExtendedBlockValue> = (blocks) =>
  blocks
    .filter((block) => !block.$virtualSlotName || props.conditionalLogic[block.$path])
    .map(
      (block) =>
        ({
          id: block.$id,
          source: block,
          label: block.$virtualSlotName
            ? resolveFieldLabel(
                dashboard.value!.blocks[block.$parent!.$key]!.fields[block.$virtualSlotName]!.ui.label,
                block.$virtualSlotName,
              )
            : dashboard.value!.blocks[block.$key]!.ui.itemLabelConfiguration?.showBlockLabel !== false ||
                dashboard.value!.blocks[block.$key]!.ui.itemLabelConfiguration?.fieldValue
              ? (dashboard.value!.blocks[block.$key]!.ui.itemLabelConfiguration?.showBlockLabel !== false
                  ? blockLabels[block.$key]
                  : '') +
                (dashboard.value!.blocks[block.$key]!.ui.itemLabelConfiguration?.fieldValue &&
                block[dashboard.value!.blocks[block.$key]!.ui.itemLabelConfiguration!.fieldValue as string] !== ''
                  ? dashboard.value!.blocks[block.$key]!.ui.itemLabelConfiguration?.showBlockLabel !== false
                    ? ` (${block[dashboard.value!.blocks[block.$key]!.ui.itemLabelConfiguration!.fieldValue as string]})`
                    : block[dashboard.value!.blocks[block.$key]!.ui.itemLabelConfiguration!.fieldValue as string]
                  : '')
              : '',
          nestable: !!block.$virtualSlotName || Object.keys(block.$nestedBlocksFields).length > 0,
          children: treeMapper(block.$children),
          expanded: expandedItems[block.$id] ?? true,
          draggable: !props.disabled && !block.$virtualSlotName,
          droppable: (items, _target, zone) => {
            if (!props.disabled) {
              if (zone === 'inside') {
                if (!!block.$virtualSlotName || Object.keys(block.$nestedBlocksFields).length === 1) {
                  const _allowedBlocks = getNestedBlocksField(block)!.$allowedBlocks
                  return items.every((item) => _allowedBlocks.includes(item.source.$key))
                }
              } else {
                if (!block.$virtualSlotName) {
                  const _allowedBlocks = getParentNestedBlocksField(block)?.$allowedBlocks ?? allowedBlocks
                  return items.every((item) => _allowedBlocks.includes(item.source.$key))
                }
              }
            }
            return false
          },
          movable: !props.disabled && !block.$virtualSlotName,
          selectable: !block.$virtualSlotName,
        }) satisfies PUITreeItemModel<ExtendedBlockValue>,
    )
const prevModelValueStringified = ref('')
const extendedModelValue: ExtendedBlockValue[] = []
const allowRootBlocks = (
  isArray(props.fieldOptions.allowRootBlocks)
    ? props.fieldOptions.allowRootBlocks.flatMap(resolveAllowDenyItem)
    : Object.keys(dashboard.value!.blocks)
) as BlockName[]
const denyRootBlocks = (
  isArray(props.fieldOptions.denyRootBlocks) ? props.fieldOptions.denyRootBlocks.flatMap(resolveAllowDenyItem) : []
) as BlockName[]
const allowNestedBlocks = (
  isArray(props.fieldOptions.allowNestedBlocks)
    ? props.fieldOptions.allowNestedBlocks.flatMap(resolveAllowDenyItem)
    : Object.keys(dashboard.value!.blocks)
) as BlockName[]
const denyNestedBlocks = uniqueArray(
  (isArray(props.fieldOptions.denyNestedBlocks)
    ? props.fieldOptions.denyNestedBlocks.flatMap(resolveAllowDenyItem)
    : Object.keys(dashboard.value!.blocks)) as BlockName[],
)
const allowedBlocks = Object.keys(dashboard.value!.blocks).filter(
  (item) => allowRootBlocks.includes(item as BlockName) && !denyRootBlocks.includes(item as BlockName),
) as BlockName[]
const addBlockPopup = ref<{
  parent: ExtendedBlockValue | null
  index: number
  pathPrefix: string
  allowedBlocks: BlockName[]
} | null>(null)
const { tree, refresh } = puiTree(extendedModelValue, treeMapper)
const blockLabels = Object.fromEntries(
  sortNaturallyByProp(
    Object.entries(dashboard.value!.blocks).map(([blockName, block]) => ({
      blockName,
      label: isDefined(block.ui.label)
        ? maybeTranslate(block.ui.label)
        : __('pruvious-dashboard', titleCase(blockName, false) as any),
    })),
    'label',
  ).map(({ blockName, label }) => [blockName, label]),
)
const { listen } = usePUIHotkeys()
const actionButtons = ref<Record<number | string, any>>({})
const visibleActions = ref<PUITreeItemModel<ExtendedBlockValue> | null>(null)
const localErrors = ref<string | Record<string, string>>()
const itemErrors = computed(() => {
  const map: Record<string, number> = {}
  if (isObject(localErrors.value)) {
    const paths = Object.keys(localErrors.value)
    for (const path of paths) {
      const pathParts = path.split('.')
      while (pathParts.length) {
        const lastPart = pathParts.pop()!
        if (isStringInteger(lastPart)) {
          const itemPath = `${pathParts.join('.')}.${lastPart}`
          map[itemPath] ??= localErrors.value[itemPath] ? -1 : 0
          map[itemPath]++
          break
        }
      }
    }
  }
  return map
})
const pathMap: Record<string, string> = {}
const modelValueDiff = useWebWorkerFn((newValue: string, oldValue: string) => {
  const newObject = JSON.parse(newValue)
  const oldObject = JSON.parse(oldValue)
  function isArray<T>(value: any): value is T[] {
    return Array.isArray(value)
  }
  function isObject<T extends Record<string, any>>(value: any): value is T {
    return Object.prototype.toString.call(value) === '[object Object]'
  }
  function isNull(value: any): value is null {
    return value === null
  }
  function deepCompare(a: any, b: any): boolean {
    if (a === b) {
      return true
    } else if (isObject(a) && isObject(b)) {
      const keysA = Object.keys(a)
      const keysB = Object.keys(b)
      if (keysA.length !== keysB.length) {
        return false
      }
      for (const key of keysA) {
        if (!deepCompare(a[key], b[key])) {
          return false
        }
      }
      return true
    } else if (isArray(a) && isArray(b)) {
      if (a.length !== b.length) {
        return false
      }
      for (let i = 0; i < a.length; i++) {
        if (!deepCompare(a[i], b[i])) {
          return false
        }
      }
      return true
    }
    return false
  }
  function anonymizeObject(object: any): any {
    if (isObject(object)) {
      const result: Record<string, any> = {}
      for (const key in object) {
        if (isObject(object[key]) || isArray(object[key])) {
          result[key] = anonymizeObject(object[key])
        } else {
          result[key] = typeof object[key]
        }
      }
      return result
    } else if (isArray(object)) {
      return object.map((v) => (isObject(v) || isArray(v) ? anonymizeObject(v) : typeof v))
    }
    return object
  }
  function diff(
    oldObject: Record<string, any>,
    newObject: Record<string, any>,
  ): { path: string; oldValue: any; newValue: any }[] {
    const changes: { path: string; oldValue: any; newValue: any }[] = []
    function cmp(oldValue: any, newValue: any, path = '') {
      if (typeof oldValue !== typeof newValue) {
        changes.push({ path, oldValue, newValue })
        return
      }
      if (isNull(oldValue) || isNull(newValue)) {
        if (oldValue !== newValue) {
          changes.push({ path, oldValue, newValue })
        }
        return
      }
      if (typeof oldValue !== 'object') {
        if (oldValue !== newValue) {
          changes.push({ path, oldValue, newValue })
        }
        return
      }
      const oldIsArray = isArray(oldValue)
      const newIsArray = isArray(newValue)
      if (oldIsArray !== newIsArray) {
        changes.push({ path, oldValue, newValue })
        return
      }
      if (oldIsArray && newIsArray) {
        if (oldValue.length !== newValue.length) {
          changes.push({ path, oldValue: [...oldValue], newValue: [...newValue] })
        }
        const maxLength = Math.max(oldValue.length, newValue.length)
        for (let i = 0; i < maxLength; i++) {
          const newPath = path ? `${path}.${i}` : `${i}`

          if (i < oldValue.length && i < newValue.length) {
            cmp(oldValue[i], newValue[i], newPath)
          } else if (i < oldValue.length) {
            changes.push({ path: newPath, oldValue: oldValue[i], newValue: undefined })
          } else {
            changes.push({ path: newPath, oldValue: undefined, newValue: newValue[i] })
          }
        }
        return
      }
      const oldKeys = Object.keys(oldValue)
      const newKeys = Object.keys(newValue)
      for (const key of oldKeys) {
        const newPath = path ? `${path}.${key}` : key

        if (!newKeys.includes(key)) {
          changes.push({ path: newPath, oldValue: oldValue[key], newValue: undefined })
        } else {
          cmp(oldValue[key], newValue[key], newPath)
        }
      }
      for (const key of newKeys) {
        if (!oldKeys.includes(key)) {
          const newPath = path ? `${path}.${key}` : key
          changes.push({ path: newPath, oldValue: undefined, newValue: newValue[key] })
        }
      }
    }
    cmp(oldObject, newObject)
    return changes
  }
  return {
    structureChanged: !deepCompare(anonymizeObject(newObject), anonymizeObject(oldObject)),
    diff: diff(oldObject, newObject),
  }
})
const expandedItems: Record<string, boolean> = {}

let scrollPosition: number | undefined
const clearScrollPosition = useDebounceFn(() => {
  scrollPosition = undefined
}, 250)

refreshTree()

watchDebounced(
  () => props.modelValue,
  async (value) => {
    const newValue = JSON.stringify(value)
    if (newValue !== prevModelValueStringified.value) {
      modelValueDiff.workerTerminate()
      const { structureChanged, diff } = await modelValueDiff.workerFn(newValue, prevModelValueStringified.value)
      if (structureChanged) {
        localErrors.value = undefined
        extendedModelValue.splice(
          0,
          extendedModelValue.length,
          ...extendBlocksValue(props.modelValue, props.fieldName, null, true),
        )
      } else {
        for (const { path, newValue } of diff) {
          if (pathMap[`${props.fieldName}.${path}`]) {
            setProperty({ [props.fieldName]: extendedModelValue }, pathMap[`${props.fieldName}.${path}`]!, newValue)
          }
        }
      }
      prevModelValueStringified.value = newValue
      refresh()
    }
  },
  { debounce: 10 },
)

watch(
  () => props.conditionalLogic,
  (newValue, oldValue) => {
    if (JSON.stringify(newValue) !== JSON.stringify(oldValue)) {
      refresh()
    }
  },
)

watch(
  () => props.errors,
  () => {
    localErrors.value = Object.fromEntries(
      Object.entries(props.errors).filter(([key]) => key === props.fieldName || key.startsWith(`${props.fieldName}.`)),
    )
  },
  { immediate: true },
)

watch(tree, () => {
  if (isDefined(scrollPosition)) {
    nextTick(() => {
      if (isDefined(scrollPosition)) {
      }
    })
  } else {
    scrollPosition = treeComponent.value?.scrollable?.scroll.y.value
    clearScrollPosition()
  }
})

useEventListener('paste', pasteItemsFromEvent)

listen('selectAll', (event) => {
  if (treeComponent.value?.focused) {
    event.preventDefault()
    emit('update:selectedBlocks', treeComponent.value?.flatItems())
  }
})

listen('close', (event) => {
  if (treeComponent.value?.focused) {
    event.preventDefault()
    emit('update:selectedBlocks', [])
  }
})

function updateTreePlaceholder() {
  if (treeComponent.value?.scrollable) {
    treeComponent.value.updatePlaceholder(treeComponent.value.scrollable.scroll.y.value)
  }
}

function refreshTree() {
  extendedModelValue.splice(
    0,
    extendedModelValue.length,
    ...extendBlocksValue(props.modelValue, props.fieldName, null, true),
  )
  prevModelValueStringified.value = JSON.stringify(props.modelValue)
  refresh()
}

function extendBlocksValue(
  blocksValue: Record<string, any>[],
  fieldPath: string,
  parentBlockValue: ExtendedBlockValue | null = null,
  reuseIds = false,
  extendedPathPrefix: string | null = null,
): ExtendedBlockValue[] {
  const extendedBlocksValue: ExtendedBlockValue[] = []
  const flattenedTreeItems = reuseIds ? treeComponent.value?.flatItems() : undefined

  if (isArray(blocksValue)) {
    for (const [i, blockValue] of blocksValue.entries()) {
      if (isObject(blockValue)) {
        const block = dashboard.value!.blocks[blockValue.$key]
        const $path = `${fieldPath}.${i}`
        const existingTreeItem = flattenedTreeItems?.find((item) => item.source.$path === `${fieldPath}.${i}`)
        const extendedBlockValue: ExtendedBlockValue = {
          $id: existingTreeItem?.source.$key === blockValue.$key ? existingTreeItem!.source.$id : nanoid(),
          $path,
          $parent: parentBlockValue,
          $children: [],
          $nestedBlocksFields: {},
          $virtualSlotName: null,
          ...blockValue,
        }
        const extendedPath = extendedPathPrefix ?? resolveExtendedPathPrefix(extendedBlockValue)

        pathMap[$path] = extendedPath

        for (const fieldName of Object.keys(blockValue)) {
          pathMap[`${$path}.${fieldName}`] = `${extendedPath}.${fieldName}`
        }

        if (block) {
          extendedBlockValue.$nestedBlocksFields = resolveNestedBlocksFields(extendedBlockValue, block)
          const keys = Object.keys(extendedBlockValue.$nestedBlocksFields)

          if (keys.length === 1) {
            const $path = `${extendedBlockValue.$path}.${keys[0]}`
            const _extendedPath = `${extendedPath}.$children`
            pathMap[$path] = _extendedPath
            extendedBlockValue.$children = extendBlocksValue(
              blockValue[keys[0]!],
              $path,
              extendedBlockValue,
              reuseIds,
              _extendedPath,
            )
          } else if (keys.length > 1) {
            extendedBlockValue.$children = keys.map((fieldName, i) => {
              const $path = `${extendedBlockValue.$path}.${fieldName}`
              const existingTreeItem = flattenedTreeItems?.find((item) => item.source.$path === $path)
              pathMap[$path] = `${extendedPath}.$children.${i}`
              return {
                $id:
                  existingTreeItem?.source.$parent?.$key === blockValue.$key ? existingTreeItem!.source.$id : nanoid(),
                $path,
                $parent: extendedBlockValue,
                $children: [],
                $nestedBlocksFields: {},
                $virtualSlotName: fieldName,
              }
            })

            for (const [i, virtualSlot] of extendedBlockValue.$children.entries()) {
              virtualSlot.$children = extendBlocksValue(
                blockValue[virtualSlot.$virtualSlotName!],
                virtualSlot.$path,
                virtualSlot,
                reuseIds,
                `${extendedPath}.$children.${i}`,
              )
            }
          }
        }

        extendedBlocksValue.push(extendedBlockValue)
      }
    }
  }

  return extendedBlocksValue
}

function repairExtendedBlocksValue(
  extendedBlocksValue: ExtendedBlockValue[],
  fieldPath: string,
  parentBlockValue: ExtendedBlockValue | null = null,
) {
  const repairedBlocksValue: ExtendedBlockValue[] = []

  for (const [i, extendedBlockValue] of extendedBlocksValue.entries()) {
    const $path = extendedBlockValue.$virtualSlotName
      ? `${fieldPath}.${extendedBlockValue.$virtualSlotName}`
      : `${fieldPath}.${i}`
    const block = dashboard.value!.blocks[extendedBlockValue.$key]
    const blockValue = omit(extendedBlockValue, [
      '$id',
      '$path',
      '$parent',
      '$children',
      '$nestedBlocksFields',
      '$virtualSlotName',
    ])
    const repairedBlockValue: ExtendedBlockValue = {
      $id: extendedBlockValue.$id,
      $path,
      $parent: parentBlockValue,
      $children: extendedBlockValue.$children,
      $nestedBlocksFields: extendedBlockValue.$nestedBlocksFields,
      $virtualSlotName: extendedBlockValue.$virtualSlotName,
      ...blockValue,
    }
    const extendedPath = resolveExtendedPathPrefix(repairedBlockValue)

    pathMap[$path] = extendedPath

    for (const fieldName of Object.keys(blockValue)) {
      pathMap[`${$path}.${fieldName}`] = `${extendedPath}.${fieldName}`
    }

    if (block) {
      repairedBlockValue.$nestedBlocksFields = resolveNestedBlocksFields(repairedBlockValue, block)
    }

    const keys = Object.keys(repairedBlockValue.$nestedBlocksFields)

    if (extendedBlockValue.$virtualSlotName) {
      repairedBlockValue.$children = repairExtendedBlocksValue(repairedBlockValue.$children, $path, repairedBlockValue)
    } else if (keys.length === 1) {
      repairedBlockValue.$children = repairExtendedBlocksValue(
        repairedBlockValue.$children,
        `${repairedBlockValue.$path}.${keys[0]}`,
        repairedBlockValue,
      )
      repairedBlockValue[keys[0]!] = retractExtendedBlocksValue(repairedBlockValue.$children)
    } else if (keys.length > 1) {
      for (const key of keys) {
        repairedBlockValue.$children = repairExtendedBlocksValue(
          repairedBlockValue.$children,
          repairedBlockValue.$path,
          repairedBlockValue,
        )
        repairedBlockValue[key] = retractExtendedBlocksValue(
          repairedBlockValue.$children.find((child) => child.$virtualSlotName === key)!.$children,
        )
      }
    }

    repairedBlocksValue.push(repairedBlockValue)
  }

  return repairedBlocksValue
}

function resolveExtendedPathPrefix(extendedBlockValue: ExtendedBlockValue) {
  const pathParts: (string | number)[] = []

  let current = extendedBlockValue
  let parent = current.$parent

  while (parent) {
    pathParts.unshift(
      '$children',
      parent.$children.findIndex((child) => child.$id === current.$id),
    )

    current = parent
    parent = current.$parent
  }

  const modelIndex = extendedModelValue.findIndex((child) => child.$id === current.$id)

  return [props.fieldName, modelIndex > -1 ? modelIndex : current.$path.split('.')[1], ...pathParts].join('.')
}

function resolveNestedBlocksFields(extendedBlockValue: ExtendedBlockValue, block: SerializableBlock) {
  return Object.fromEntries(
    Object.entries(block.fields)
      .filter(([_, { _fieldType }]) => _fieldType === 'blocks')
      .map(([fieldName, fieldOptions]) => {
        let _allowNestedBlocks = allowNestedBlocks
        let _denyNestedBlocks = denyNestedBlocks
        let _parent = extendedBlockValue.$parent

        while (_parent) {
          if (_parent.$virtualSlotName) {
            _allowNestedBlocks = _parent.$parent!.$nestedBlocksFields[_parent.$virtualSlotName]!.$allowNestedBlocks
            _denyNestedBlocks = _parent.$parent!.$nestedBlocksFields[_parent.$virtualSlotName]!.$denyNestedBlocks
            break
          } else if (Object.keys(_parent.$nestedBlocksFields).length === 1) {
            const name = Object.keys(_parent.$nestedBlocksFields)[0]!
            _allowNestedBlocks = _parent.$nestedBlocksFields[name]!.$allowNestedBlocks
            _denyNestedBlocks = _parent.$nestedBlocksFields[name]!.$denyNestedBlocks
            break
          }
          _parent = _parent.$parent
        }

        const fo = fieldOptions as SerializableFieldOptions<'blocks'>
        const $allowRootBlocks = (
          isArray(fo.allowRootBlocks)
            ? fo.allowRootBlocks.flatMap(resolveAllowDenyItem)
            : Object.keys(dashboard.value!.blocks)
        ).filter((item) => _allowNestedBlocks.includes(item as BlockName)) as BlockName[]
        const $denyRootBlocks = [
          ..._denyNestedBlocks,
          ...(isArray(fo.denyRootBlocks) ? fo.denyRootBlocks.flatMap(resolveAllowDenyItem) : []),
        ] as BlockName[]
        const $allowNestedBlocks = (
          isArray(fo.allowNestedBlocks)
            ? fo.allowNestedBlocks.flatMap(resolveAllowDenyItem)
            : Object.keys(dashboard.value!.blocks)
        ).filter((item) => _allowNestedBlocks.includes(item as BlockName)) as BlockName[]
        const $denyNestedBlocks = uniqueArray([
          ..._denyNestedBlocks,
          ...(isArray(fo.denyNestedBlocks)
            ? fo.denyNestedBlocks.flatMap(resolveAllowDenyItem)
            : Object.keys(dashboard.value!.blocks)),
        ]) as BlockName[]
        const $allowedBlocks = Object.keys(dashboard.value!.blocks).filter(
          (item) => $allowRootBlocks.includes(item as BlockName) && !$denyRootBlocks.includes(item as BlockName),
        ) as BlockName[]

        return [
          fieldName,
          {
            $allowRootBlocks,
            $denyRootBlocks,
            $allowNestedBlocks,
            $denyNestedBlocks,
            $allowedBlocks,
            ...(fieldOptions as SerializableFieldOptions<'blocks'>),
          } satisfies NestedBlocksField,
        ]
      }),
  ) as Record<string, NestedBlocksField>
}

function retractExtendedBlocksValue(extendedBlocksValue: ExtendedBlockValue[]): BlockValue[] {
  return extendedBlocksValue.map((extendedBlockValue) => {
    const { $id, $path, $parent, $children, $nestedBlocksFields, $virtualSlotName, ...blocksValue } = extendedBlockValue
    const block = dashboard.value!.blocks[extendedBlockValue.$key]

    if (block) {
      const nestedBlocksFieldNames = Object.entries(block.fields)
        .filter(([_, { _fieldType }]) => _fieldType === 'blocks')
        .map(([fieldName]) => fieldName)

      if (nestedBlocksFieldNames.length === 1) {
        blocksValue[nestedBlocksFieldNames[0]!] = retractExtendedBlocksValue(extendedBlockValue.$children)
      } else if (nestedBlocksFieldNames.length > 1) {
        for (const [i, nestedBlocksFieldName] of nestedBlocksFieldNames.entries()) {
          blocksValue[nestedBlocksFieldName] = retractExtendedBlocksValue(extendedBlockValue.$children[i]!.$children)
        }
      }
    }

    return blocksValue as BlockValue
  })
}

function resolveAllowDenyItem(item: string) {
  if (item.startsWith('group:')) {
    const groupName = item.slice(6) as BlockGroupName
    return Object.entries(dashboard.value!.blocks)
      .filter(([_, { group }]) => group === groupName)
      .map(([blockName]) => blockName)
  } else if (item.startsWith('tag:')) {
    const tagName = item.slice(4) as BlockTagName
    return Object.entries(dashboard.value!.blocks)
      .filter(([_, { tags }]) => tags.includes(tagName))
      .map(([blockName]) => blockName)
  }
  return [item as BlockName]
}

function emitValue() {
  const modelValue = retractExtendedBlocksValue(extendedModelValue)
  prevModelValueStringified.value = JSON.stringify(modelValue)
  emit('update:modelValue', modelValue)
  emit('commit', modelValue)
}

function addBlock(blockName: BlockName, parent: ExtendedBlockValue | null, index: number, pathPrefix: string) {
  const block = createBlock(blockName)
  const extendedBlock = extendBlocksValue([block], pathPrefix, parent)[0]!
  const { $children } = parent ? getLists(parent) : { $children: extendedModelValue }
  $children.splice(index, 0, extendedBlock)
  $children.splice(0, $children.length, ...repairExtendedBlocksValue($children, pathPrefix, parent))
  const newModelValue = retractExtendedBlocksValue(extendedModelValue)
  prevModelValueStringified.value = JSON.stringify(newModelValue)
  localErrors.value = undefined
  const newData = { ...props.data, [props.fieldName]: newModelValue }
  props.conditionalLogicResolver
    ?.setInput(newData)
    .setConditionalLogic(parseConditionalLogic(props.fields ?? {}, newData))
    .resolve()
  Object.assign(props.conditionalLogic ?? {}, props.conditionalLogicResolver?.results)
  refresh()
  setTimeout(() => {
    const treeItem = treeComponent.value?.flatItems().find((item) => item.id === extendedBlock.$id)!
    emitValue()
    emit('update:selectedBlocks', [treeItem])
    emit('queueConditionalLogicUpdate', '$reset')
  })
}

function createBlock(blockName: BlockName) {
  return {
    $key: blockName,
    ...remap(dashboard.value!.blocks[blockName]!.fields, (fieldName, options) => [
      fieldName,
      deepClone(options.default),
    ]),
  }
}

function getNestedBlocksField(extendedBlockValue: ExtendedBlockValue) {
  if (extendedBlockValue.$virtualSlotName) {
    return extendedBlockValue.$parent!.$nestedBlocksFields[extendedBlockValue.$virtualSlotName]!
  } else if (!isEmpty(extendedBlockValue.$nestedBlocksFields)) {
    return extendedBlockValue.$nestedBlocksFields[Object.keys(extendedBlockValue.$nestedBlocksFields)[0]!]!
  }
  return null
}

function getParentNestedBlocksField(extendedBlockValue: ExtendedBlockValue) {
  if (extendedBlockValue.$parent) {
    return extendedBlockValue.$parent.$virtualSlotName
      ? extendedBlockValue.$parent.$parent!.$nestedBlocksFields[extendedBlockValue.$parent.$virtualSlotName]!
      : extendedBlockValue.$parent.$nestedBlocksFields[Object.keys(extendedBlockValue.$parent.$nestedBlocksFields)[0]!]!
  }
  return null
}

function getParentLists(extendedBlockValue: ExtendedBlockValue): {
  $children: ExtendedBlockValue[]
  blocksFieldValue: BlockValue[]
  isRoot: boolean
} {
  if (extendedBlockValue.$parent?.$virtualSlotName) {
    return {
      $children: extendedBlockValue.$parent.$children,
      blocksFieldValue: extendedBlockValue[extendedBlockValue.$parent.$virtualSlotName],
      isRoot: false,
    }
  } else if (extendedBlockValue.$parent) {
    return {
      $children: extendedBlockValue.$parent.$children,
      blocksFieldValue: extendedBlockValue.$parent[Object.keys(extendedBlockValue.$parent.$nestedBlocksFields)[0]!],
      isRoot: false,
    }
  } else {
    return { $children: extendedModelValue, blocksFieldValue: props.modelValue, isRoot: true }
  }
}

function getLists(extendedBlockValue: ExtendedBlockValue): {
  $children: ExtendedBlockValue[]
  blocksFieldValue: BlockValue[]
} {
  if (extendedBlockValue.$virtualSlotName) {
    return {
      $children: extendedBlockValue.$children,
      blocksFieldValue: extendedBlockValue[extendedBlockValue.$virtualSlotName],
    }
  } else {
    return {
      $children: extendedBlockValue.$children,
      blocksFieldValue: extendedBlockValue[Object.keys(extendedBlockValue.$nestedBlocksFields)[0]!],
    }
  }
}

function canHaveSiblings(extendedBlockValue: ExtendedBlockValue) {
  if (extendedBlockValue.$parent) {
    const nestedBlocksField = getParentNestedBlocksField(extendedBlockValue)!
    return (
      !!nestedBlocksField.$allowedBlocks.length &&
      (nestedBlocksField.maxItems === false || nestedBlocksField.maxItems > extendedBlockValue.$parent.$children.length)
    )
  } else {
    return (
      !!allowedBlocks.length &&
      (props.fieldOptions.maxItems === false || props.fieldOptions.maxItems > extendedModelValue.length)
    )
  }
}

function canHaveChildren(extendedBlockValue: ExtendedBlockValue) {
  const nestedBlocksField = getNestedBlocksField(extendedBlockValue)
  return (
    !!nestedBlocksField &&
    nestedBlocksField.$allowedBlocks.length > 0 &&
    (nestedBlocksField.maxItems === false || nestedBlocksField.maxItems > extendedBlockValue.$children.length)
  )
}

function deleteItems(items: PUITreeItemModel<ExtendedBlockValue>[], event?: Event) {
  if (!props.disabled) {
    event?.preventDefault()
    puiDeleteTreeItems(items, tree.value).forEach(({ item }) => {
      const { $children } = getParentLists(item.source)
      const index = $children.indexOf(toRaw(item.source))
      $children.splice(index, 1)
    })
    extendedModelValue.splice(
      0,
      extendedModelValue.length,
      ...repairExtendedBlocksValue(extendedModelValue, props.fieldName),
    )
    const newModelValue = retractExtendedBlocksValue(extendedModelValue)
    prevModelValueStringified.value = JSON.stringify(newModelValue)
    localErrors.value = undefined
    const newData = { ...props.data, [props.fieldName]: newModelValue }
    props.conditionalLogicResolver
      ?.setInput(newData)
      .setConditionalLogic(parseConditionalLogic(props.fields ?? {}, newData))
      .resolve()
    Object.assign(props.conditionalLogic ?? {}, props.conditionalLogicResolver?.results)
    refresh()
    setTimeout(() => {
      emitValue()
      emit('update:selectedBlocks', [])
      emit('queueConditionalLogicUpdate', '$reset')
    })
  }
}

function moveItems(direction: 'up' | 'down', items: PUITreeItemModel<ExtendedBlockValue>[], event?: Event) {
  if (!props.disabled) {
    event?.preventDefault()
    const moved = puiMoveTreeItems(items, tree.value, direction)
    for (const { item, oldIndex, newIndex } of moved) {
      if (oldIndex !== newIndex) {
        const { $children } = getParentLists(item.source)
        $children.splice(oldIndex, 1)
        $children.splice(newIndex, 0, item.source)
        const basePath = item.source.$path.split('.').slice(0, -1).join('.')
        const oldConditionalLogic = Object.fromEntries(
          Object.entries(props.conditionalLogic)
            .filter(([key]) => key.startsWith(`${basePath}.${oldIndex}.`))
            .map(([key, value]) => [key.replace(`${basePath}.${oldIndex}.`, `${basePath}.${newIndex}.`), value]),
        )
        const newConditionalLogic = Object.fromEntries(
          Object.entries(props.conditionalLogic)
            .filter(([key]) => key.startsWith(`${basePath}.${newIndex}.`))
            .map(([key, value]) => [key.replace(`${basePath}.${newIndex}.`, `${basePath}.${oldIndex}.`), value]),
        )
        Object.assign(props.conditionalLogic, oldConditionalLogic, newConditionalLogic)
      }
    }
    extendedModelValue.splice(
      0,
      extendedModelValue.length,
      ...repairExtendedBlocksValue(extendedModelValue, props.fieldName),
    )
    prevModelValueStringified.value = JSON.stringify(retractExtendedBlocksValue(extendedModelValue))
    localErrors.value = undefined
    refresh()
    setTimeout(() => {
      emit(
        'update:selectedBlocks',
        treeComponent.value!.flatItems().filter((_item) => items.some((item) => item.id === _item.id)),
      )
      emitValue()
      emit('queueConditionalLogicUpdate', '$reset')
      nextTick(() => {
        treeComponent.value?.scrollToSelection()
        setTimeout(() =>
          (treeComponent.value?.root?.querySelector('.pui-tree-item-button-selected') as HTMLElement)?.focus(),
        )
      })
    })
  }
}

function dropItems(
  items: PUITreeItemModel<ExtendedBlockValue>[],
  target: PUITreeItemModel<ExtendedBlockValue>,
  zone: PUITreeDropTarget<ExtendedBlockValue>['zone'],
) {
  if (!props.disabled) {
    const dropped = puiDropTreeItems(items, target, tree.value, zone)
    for (const { oldIndex, oldParent } of dropped) {
      const { $children } = oldParent ? getLists(oldParent.source) : { $children: extendedModelValue }
      $children.splice(oldIndex, 1)
    }
    for (const { item, newIndex, newParent } of dropped) {
      const { $children } = newParent ? getLists(newParent.source) : { $children: extendedModelValue }
      $children.splice(newIndex, 0, item.source)
    }
    extendedModelValue.splice(
      0,
      extendedModelValue.length,
      ...repairExtendedBlocksValue(extendedModelValue, props.fieldName),
    )
    const newModelValue = retractExtendedBlocksValue(extendedModelValue)
    prevModelValueStringified.value = JSON.stringify(newModelValue)
    localErrors.value = undefined
    const newData = { ...props.data, [props.fieldName]: newModelValue }
    props.conditionalLogicResolver
      ?.setInput(newData)
      .setConditionalLogic(parseConditionalLogic(props.fields ?? {}, newData))
      .resolve()
    Object.assign(props.conditionalLogic ?? {}, props.conditionalLogicResolver?.results)
    refresh()
    setTimeout(() => {
      emit(
        'update:selectedBlocks',
        treeComponent.value!.flatItems().filter((_item) => items.some((item) => item.id === _item.id)),
      )
      emitValue()
      emit('queueConditionalLogicUpdate', '$reset')
      nextTick(() =>
        (treeComponent.value?.root?.querySelector('.pui-tree-item-button-selected') as HTMLElement)?.focus(),
      )
    })
  }
}

function duplicateItems(items: PUITreeItemModel<ExtendedBlockValue>[], event?: Event) {
  if (!props.disabled) {
    event?.preventDefault()
    const clones: ExtendedBlockValue[] = []
    for (const item of items) {
      const { $children } = getParentLists(item.source)
      const index = $children.indexOf(toRaw(item.source))
      const clone = cloneBlock(item.source)
      $children.splice(index + 1, 0, clone)
      randomizeIds(clone)
      clones.push(clone)
    }
    extendedModelValue.splice(
      0,
      extendedModelValue.length,
      ...repairExtendedBlocksValue(extendedModelValue, props.fieldName),
    )
    const newModelValue = retractExtendedBlocksValue(extendedModelValue)
    prevModelValueStringified.value = JSON.stringify(newModelValue)
    localErrors.value = undefined
    const newData = { ...props.data, [props.fieldName]: newModelValue }
    props.conditionalLogicResolver
      ?.setInput(newData)
      .setConditionalLogic(parseConditionalLogic(props.fields ?? {}, newData))
      .resolve()
    Object.assign(props.conditionalLogic ?? {}, props.conditionalLogicResolver?.results)
    refresh()
    setTimeout(() => {
      emitValue()
      emit(
        'update:selectedBlocks',
        clones.map((clone) => treeComponent.value?.flatItems().find((item) => item.source.$id === clone.$id)!),
      )
      emit('queueConditionalLogicUpdate', '$reset')
    })
  }
}

function pasteItemsFromEvent(event: ClipboardEvent) {
  if (!props.disabled) {
    const pastedText = event.clipboardData?.getData('text/plain')
    if (pastedText && pastedText.startsWith('{"pruviousClipboardDataType":')) {
      try {
        const data = JSON.parse(pastedText) as PruviousClipboardData
        if (data.pruviousClipboardDataType === 'blocks') {
          pasteItems(data.data, props.selectedBlocks)
        }
      } catch {}
    }
  }
}

function pasteItems(
  blockValues: BlockValue[],
  targets: PUITreeItemModel<ExtendedBlockValue>[],
  position: 'auto' | 'before' | 'after' = 'auto',
) {
  if (blockValues.length) {
    const newIds: string[] = []
    if (targets.length) {
      for (const target of targets) {
        const keys = Object.keys(target.source.$nestedBlocksFields)
        if (keys.length > 0 && position === 'auto') {
          const nestedBlocksField = getNestedBlocksField(target.source)!
          for (const blockValue of blockValues) {
            if (nestedBlocksField.$allowedBlocks.includes(blockValue.$key) && canHaveChildren(target.source)) {
              const extendedBlock = extendBlocksValue([blockValue], target.source.$path, target.source)[0]!
              const $children = keys.length === 1 ? target.source.$children : target.source.$children[0]!.$children
              $children.push(extendedBlock)
              newIds.push(extendedBlock.$id)
            }
          }
        } else {
          const nestedBlocksField = getParentNestedBlocksField(target.source)
          for (const blockValue of blockValues) {
            if (
              nestedBlocksField
                ? nestedBlocksField.$allowedBlocks.includes(blockValue.$key) && canHaveSiblings(target.source)
                : allowedBlocks.includes(blockValue.$key) &&
                  (props.fieldOptions.maxItems === false || extendedModelValue.length < props.fieldOptions.maxItems)
            ) {
              const extendedBlock = extendBlocksValue([blockValue], target.source.$path, target.source)[0]!
              const $children = target.source.$parent?.$children ?? extendedModelValue
              const index = $children.indexOf(toRaw(target.source)) + (1 - Number(position === 'before'))
              $children.splice(index, 0, extendedBlock)
              newIds.push(extendedBlock.$id)
            }
          }
        }
      }
    } else {
      for (const blockValue of blockValues) {
        if (
          allowedBlocks.includes(blockValue.$key) &&
          (props.fieldOptions.maxItems === false || extendedModelValue.length < props.fieldOptions.maxItems)
        ) {
          const extendedBlock = extendBlocksValue([blockValue], props.fieldName)[0]!
          extendedModelValue.push(extendedBlock)
          newIds.push(extendedBlock.$id)
        }
      }
    }
    extendedModelValue.splice(
      0,
      extendedModelValue.length,
      ...repairExtendedBlocksValue(extendedModelValue, props.fieldName),
    )
    const newModelValue = retractExtendedBlocksValue(extendedModelValue)
    prevModelValueStringified.value = JSON.stringify(newModelValue)
    localErrors.value = undefined
    const newData = { ...props.data, [props.fieldName]: newModelValue }
    props.conditionalLogicResolver
      ?.setInput(newData)
      .setConditionalLogic(parseConditionalLogic(props.fields ?? {}, newData))
      .resolve()
    Object.assign(props.conditionalLogic ?? {}, props.conditionalLogicResolver?.results)
    refresh()
    setTimeout(() => {
      const treeItems = treeComponent.value!.flatItems().filter((item) => newIds.includes(item.source.$id))
      emitValue()
      emit('update:selectedBlocks', treeItems)
      emit('queueConditionalLogicUpdate', '$reset')
    })
    const notPasted = blockValues.length * (targets.length || 1) - newIds.length
    if (notPasted) {
      puiToast(__('pruvious-dashboard', '$count blocks could not be pasted', { count: notPasted }), { type: 'warning' })
    }
  }
}

function cloneBlock(extendedBlockValue: ExtendedBlockValue): ExtendedBlockValue {
  const { $id, $path, $parent, $children, $nestedBlocksFields, $virtualSlotName, ...fieldValues } = extendedBlockValue
  const clone: ExtendedBlockValue = {
    $id,
    $path,
    $parent,
    $children: $children.map(cloneBlock),
    $nestedBlocksFields,
    $virtualSlotName,
    ...deepClone(fieldValues),
  }
  return clone
}

function randomizeIds(extendedBlockValue: ExtendedBlockValue) {
  extendedBlockValue.$id = nanoid()
  extendedBlockValue.$children.forEach(randomizeIds)
}
</script>

<style scoped>
.p-blocks-tree-wrapper {
  position: relative;
  height: 100%;
}

.p-blocks-tree {
  width: calc(100% + 0.25rem);
  height: calc(100% + 0.25rem);
  margin: -0.125rem;
}

.p-blocks-tree-empty {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  color: hsl(var(--pui-muted-foreground));
  font-size: 0.875rem;
}

.p-blocks-tree-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.p-blocks-tree-item-slot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  color: hsl(var(--pui-muted-foreground));
  font-size: calc(1em - 0.1875rem);
  font-weight: 600;
  text-transform: uppercase;
}

.p-blocks-tree-item-actions {
  flex-shrink: 0;
  display: none;
  gap: 0.0625rem;
}

:deep(.pui-tree-item-button .p-blocks-tree-item-actions .pui-button) {
  transition-property: background-color, border-color, border-radius, box-shadow, color;
}

:deep(.pui-tree-item-button-highlighted .p-blocks-tree-item-actions .pui-button) {
  border-radius: calc(var(--pui-radius) - 0.375rem);
}

:deep(.pui-tree-item-button-selected .p-blocks-tree-item-actions .pui-button) {
  border-radius: calc(var(--pui-radius) - 0.25rem);
}

:deep(.pui-tree-item-button-highlighted) .p-blocks-tree-item-actions,
:deep(.pui-tree-item-button:hover) .p-blocks-tree-item-actions,
.p-blocks-tree-item-actions-visible {
  display: flex;
}

.p-blocks-tree > :deep(.pui-scrollable > .pui-scrollable-button:first-child) {
  background: linear-gradient(to top, hsl(var(--pui-background) / 0), hsl(var(--pui-background)));
}

.p-blocks-tree > :deep(.pui-scrollable > .pui-scrollable-button:last-child) {
  background: linear-gradient(to bottom, hsl(var(--pui-background) / 0), hsl(var(--pui-background)));
}

.p-blocks-tree-error-button {
  cursor: help;
}

.p-blocks-tree-error-button:hover {
  background-color: hsl(var(--pui-destructive));
}

:deep(.pui-tree-item-button) {
  padding-right: 0.25rem;
}

:deep(.pui-tree-item-button:not(.pui-tree-item-button-selectable) .pui-tree-item-toggle) {
  display: none;
}

:deep(.pui-tree-item-button:not(.pui-tree-item-button-selectable) .pui-tree-item-icon) {
  margin-left: 1rem;
}

:deep(.pui-tree-item-label) {
  width: 100%;
}
</style>
