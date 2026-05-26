<template>
  <PruviousRichText
    :allowLineBreaks="allowLineBreaks"
    :data-field-path="fieldPath"
    :data-is-editable="isLocallyEditable"
    :disabled="!isLocallyEditable"
    :key="key"
    :links="links"
    :marks="marks"
    :maybeTranslate="maybeTranslate"
    :modelValue="html"
    :normalizeWhitespace="normalizeWhitespace"
    :placeholder="placeholder"
    :tag="tag"
    :toolbar="toolbar"
    @deleteBlock="onDeleteBlock()"
    @deleteEnd="onDeleteEnd"
    @deleteStart="onDeleteStart"
    @duplicate="onDuplicate()"
    @enterKey="onEnterKey"
    @focus="onFocus()"
    @linkApplied="onLinkApplied"
    @linkPickerOpen="onLinkPickerOpen"
    @moveDown="onMove(1)"
    @moveUp="onMove(-1)"
    @onInsert="onInsert"
    @paste="onPaste"
    @redo="redo()"
    @selectNext="focusNextEditableField(fieldPath, $event)"
    @selectPrevious="focusPrevEditableField(fieldPath, $event)"
    @undo="undo()"
    @unfocus="onUnfocus()"
    @update:modelValue="onUpdateModelValue"
    ref="root"
  />
</template>

<script lang="ts" setup>
import {
  blockPathInjection,
  inLinkedBlocksInjection,
  proseListItemBlockPathInjection,
  usePruviousRoute,
} from '#pruvious/app'
import { usePreview, type PruviousClipboardData } from '#pruvious/dashboard'
import type { BlockName } from '#pruvious/server'
import {
  blurActiveElement,
  castToNumber,
  deepClone,
  getProperty,
  isArray,
  isDefined,
  isNumber,
  isObject,
  isString,
  last,
  stripHTML,
} from '@pruvious/utils'
import {
  blocksFieldCanHaveMoreChildren,
  type ResolvedParentBlocksFieldInfo,
} from '../../../modules/pruvious/preview/utils/blocks-field'
import {
  registerLinkPickerHandler,
  unregisterLinkPickerHandler,
} from '../../../modules/pruvious/preview/utils/messages'
import type { EditableTextNextFocus } from '../../../modules/pruvious/preview/utils/rich-text'
import { usePreviewState } from '../../../modules/pruvious/preview/utils/state'
import type { LinksOptions, RichTextFormatter } from '../../../server/fields/richText'

const props = defineProps({
  /**
   * The HTML content.
   */
  html: {
    type: String,
    required: true,
  },

  /**
   * The HTML tag name to use for the root element when rendering this component.
   */
  tag: {
    type: String,
    required: true,
  },

  /**
   * The full field path in dot notation associated with the content of this component.
   *
   * @example
   * ```ts
   * 'text'
   * 'button.label'
   * 'products.0.productDescription'
   * ```
   */
  fieldPath: {
    type: String,
    required: true,
  },
})

const proute = usePruviousRoute()
const {
  isEditable,
  isFocused,
  parsedFields,
  focusedBlocks,
  editableTextNextFocus,
  maybeTranslate,
  messageDashboard,
  resolveBlocksField,
  resolveAllParentBlocksFields,
  insertBlock,
  moveBlock,
  updateBlockField,
  duplicateBlock,
  replaceBlock,
  deleteBlock,
  deleteBlockCascade,
  commitData,
  commitDataDebounced,
  undo,
  redo,
  selectBlock,
  selectBlockAfterMutation,
  selectNearestBlock,
  deselectBlocks,
  rememberEditableFieldSelection,
  focusEditableField,
  focusEditableFieldAfterMutation,
  focusPrevEditableField,
  focusNextEditableField,
  focusNearestEditableField,
  resolveFocusedBlocks,
  getAllDOMEditableFields,
} = usePreview()
const { historyIndex, editableFieldsSelectionHistory, allowDashboardBlockSelection } = usePreviewState()

const root = useTemplateRef('root')
const key = computed(() => `${props.tag}_${props.fieldPath}`)
const fieldOptions = computed(() => parsedFields.value[props.fieldPath])
const allowLineBreaks = computed(
  () => fieldOptions.value?._fieldType === 'richText' && !!fieldOptions.value.allowLineBreaks,
)
const marks = computed(() => (fieldOptions.value?._fieldType === 'richText' ? fieldOptions.value.marks : {}))
const links = computed(() =>
  fieldOptions.value?._fieldType === 'richText' ? (fieldOptions.value.links ?? false) : false,
)
const normalizeWhitespace = computed(
  () => fieldOptions.value?._fieldType === 'richText' && !!fieldOptions.value.normalizeWhitespace,
)
const toolbar = computed(() =>
  fieldOptions.value?._fieldType === 'richText' ? (fieldOptions.value.ui.liveEditor?.toolbar ?? 'auto') : false,
)
const placeholder = computed(() =>
  isObject(fieldOptions.value?.ui) ? maybeTranslate(fieldOptions.value.ui.placeholder) : undefined,
)
const blockPath = inject(blockPathInjection)
const inLinkedBlocks = inject(inLinkedBlocksInjection, false)
const isLocallyEditable = computed(() => isEditable.value && !inLinkedBlocks)
const parentBlocksFields = computed(() => (blockPath?.value ? resolveAllParentBlocksFields(blockPath.value) : []))
const proseListItemBlockPath = inject(proseListItemBlockPathInjection, undefined)
const listInfo = computed(() => getListInfo(proseListItemBlockPath?.value))

let currentHTML = props.html
let currentText = stripHTML(props.html)

watch(
  () => props.html,
  (newHTML) => {
    currentHTML = newHTML
  },
)

watch([editableTextNextFocus, key], () => setTimeout(consumeFocus), { flush: 'sync', immediate: true })

function consumeFocus() {
  if (editableTextNextFocus.value) {
    const { path, selection, timestamp } = editableTextNextFocus.value

    if (
      isFocused.value &&
      (path === props.fieldPath || (path.endsWith('*') && props.fieldPath.startsWith(path.slice(0, -1)))) &&
      timestamp + 500 > Date.now()
    ) {
      if (root.value) {
        resolveFocusedBlocks(root.value.$el) // allows focus
        root.value.$el.focus()

        if (isDefined(selection)) {
          if (isNumber(selection)) {
            root.value.setSelection(selection, selection)
          } else {
            root.value.setSelection(selection.from, selection.to)
          }
        }

        if (blockPath?.value) {
          selectBlock(blockPath.value)
        }
      }

      editableTextNextFocus.value = null
    }
  }
}

function getSelection(): EditableTextNextFocus['selection'] {
  const selection: [number, number] | undefined = root.value?.$el.dataset.selection?.split(',').map(castToNumber)
  return selection ? { from: selection[0], to: selection[1] } : undefined
}

function getNearestBlocksFieldWithSingleChild() {
  let found: ResolvedParentBlocksFieldInfo<BlockName> | null = null

  for (const blocksField of parentBlocksFields.value) {
    if (blocksField.fieldData.length === 1) {
      found = blocksField
    } else {
      break
    }
  }

  return found
}

async function onUpdateModelValue(html: string, text: string) {
  if (html !== currentHTML) {
    if (historyIndex.value === 0 && !editableFieldsSelectionHistory.value[0]) {
      rememberEditableFieldSelection()
    }

    updateBlockField(props.fieldPath, html)

    const oldHTML = currentHTML
    const oldText = currentText

    currentHTML = html
    currentText = text

    const formatted = await handleFormatting(currentHTML, oldHTML, currentText, oldText)

    if (!formatted) {
      commitDataDebounced()
    }
  } else if (text !== currentText) {
    const oldText = currentText
    currentText = text
    await handleFormatting(currentHTML, currentHTML, currentText, oldText)
  }
}

function onFocus() {
  if (last(focusedBlocks.value)?.path !== blockPath?.value) {
    root.value?.$el.blur()
  }
}

function onUnfocus() {
  if (blockPath?.value) {
    blurActiveElement()
    selectBlock(blockPath.value)
  }
}

function onMove(offset: number) {
  if (blockPath?.value) {
    rememberEditableFieldSelection()

    const targetBlockPath = getNearestBlocksFieldWithSingleChild()?.blockPath ?? blockPath.value
    const newBlockPath = moveBlock(targetBlockPath, offset)

    if (newBlockPath) {
      focusEditableField(newBlockPath + props.fieldPath.slice(targetBlockPath.length), getSelection())
      commitData()
    }
  }
}

function onInsert(position: 'before' | 'after') {
  if (blockPath?.value) {
    rememberEditableFieldSelection()
    messageDashboard('iframe:addBlock', { blockPath: blockPath.value, position })
  }
}

function onLinkPickerOpen(attrs: { href: string; target: string; rel: string }, options: LinksOptions) {
  messageDashboard('iframe:openLinkPicker', {
    fieldPath: props.fieldPath,
    href: attrs.href,
    target: attrs.target,
    rel: attrs.rel,
    options,
  })
}

function onLinkApplied() {
  commitData()
}

onMounted(() => {
  registerLinkPickerHandler(props.fieldPath, (value) => {
    root.value?.applyLink(value)
  })
})

onBeforeUnmount(() => {
  unregisterLinkPickerHandler(props.fieldPath)
})

function onEnterKey(valueBefore: string, valueAfter: string) {
  if (blockPath?.value) {
    rememberEditableFieldSelection()

    const valueBeforeTrimmed = valueBefore.trim()
    const valueAfterTrimmed = valueAfter.trim()

    // Handle lists
    if (fieldOptions.value?._fieldType === 'richText' && listInfo.value) {
      const { listContentField, listItemBlockPath, listItemContentField, listParentBlocksField } = listInfo.value

      if (valueBeforeTrimmed || valueAfterTrimmed) {
        if (listItemContentField.fieldData.length === 1) {
          // Split into new list item
          if (listContentField.canHaveMoreChildren()) {
            const duplicateBlockPath = duplicateBlock(listItemBlockPath)

            if (duplicateBlockPath) {
              const duplicateFieldPath = duplicateBlockPath + props.fieldPath.slice(listItemBlockPath.length)

              updateBlockField(props.fieldPath, valueBeforeTrimmed)
              updateBlockField(duplicateFieldPath, valueAfterTrimmed)
              focusEditableField(duplicateFieldPath, 0)
              commitData()
              return
            }
          }
        }
      } else {
        const hasSiblings = listItemContentField.fieldData.length > 1

        if (hasSiblings) {
          // Outdent to parent list item
          if (
            isArray(listItemContentField?.fieldOptions.default) &&
            listItemContentField.fieldOptions.default.length &&
            isArray(listContentField?.fieldOptions.default) &&
            listContentField.fieldOptions.default.length &&
            listContentField.canHaveMoreChildren()
          ) {
            const duplicateBlockPath = duplicateBlock(listItemBlockPath)

            if (duplicateBlockPath) {
              const prevSiblings = deepClone(
                listItemContentField.index
                  ? listItemContentField.fieldData.slice(0, listItemContentField.index)
                  : listItemContentField.fieldOptions.default,
              )
              const nextSiblings = deepClone(listItemContentField.fieldData.slice(listItemContentField.index))

              updateBlockField(listItemContentField.fieldPath, prevSiblings)
              updateBlockField(`${duplicateBlockPath}.${listItemContentField.fieldName}`, nextSiblings)
              focusEditableField(`${duplicateBlockPath}.${listItemContentField.fieldName}.*`, 0)
              commitData()
              return
            }
          }
        } else if (
          isArray(listParentBlocksField?.fieldOptions.default) &&
          listParentBlocksField.fieldOptions.default.length &&
          listParentBlocksField?.canHaveMoreChildren()
        ) {
          // Outdent to parent block
          if (listContentField.index === 0 || listContentField.index === listContentField.fieldData.length - 1) {
            // List item is at the start or end of the list
            const newListContent = deepClone(listContentField.fieldData)
            newListContent.splice(listContentField.index, 1)
            updateBlockField(listContentField.fieldPath, newListContent)

            if (!newListContent.length) {
              deleteBlock(listContentField.fieldPath)
            }

            const newBlockIndex = listParentBlocksField.index + (listContentField.index === 0 ? 0 : 1)
            const newBlock = insertBlock(
              listParentBlocksField.fieldPath,
              newBlockIndex,
              listParentBlocksField.fieldOptions.default[0] as any,
            )

            if (newBlock) {
              focusEditableField(`${listParentBlocksField.fieldPath}.${newBlockIndex}.*`, 0)
              focusEditableFieldAfterMutation(`${listParentBlocksField.fieldPath}.${newBlockIndex}.*`, 0)
            }

            commitData()
            return
          } else {
            // List item is in the middle of the list
            const maxItems = isNumber(listParentBlocksField.fieldOptions.maxItems)
              ? listParentBlocksField.fieldOptions.maxItems - 1
              : false

            if (blocksFieldCanHaveMoreChildren(listParentBlocksField.blockPath!, maxItems)) {
              const prevSiblings = deepClone(
                listContentField.index
                  ? listContentField.fieldData.slice(0, listContentField.index)
                  : listContentField.fieldOptions.default,
              )
              const nextSiblings = deepClone(listContentField.fieldData.slice(listContentField.index + 1))
              const duplicatedListPath = duplicateBlock(listContentField.blockPath!)

              if (duplicatedListPath) {
                updateBlockField(listContentField.fieldPath, prevSiblings)
                updateBlockField(`${duplicatedListPath}.${listContentField.fieldName}`, nextSiblings)

                const newBlockIndex = listParentBlocksField.index + 1
                const newBlock = insertBlock(
                  listParentBlocksField.fieldPath,
                  newBlockIndex,
                  listParentBlocksField.fieldOptions.default[0] as any,
                )

                if (newBlock) {
                  focusEditableField(`${listParentBlocksField.fieldPath}.${newBlockIndex}.*`, 0)
                  focusEditableFieldAfterMutation(`${listParentBlocksField.fieldPath}.${newBlockIndex}.*`, 0)
                }

                commitData()
                return
              }
            }
          }
        }
      }
    }

    const duplicateBlockPath = duplicateBlock(blockPath.value)

    if (duplicateBlockPath) {
      const duplicateFieldPath = duplicateBlockPath + props.fieldPath.slice(blockPath.value.length)

      updateBlockField(props.fieldPath, valueBeforeTrimmed)
      updateBlockField(duplicateFieldPath, valueAfterTrimmed)
      focusEditableField(duplicateFieldPath, 0)
      commitData()
    }
  }
}

function onDuplicate() {
  if (blockPath?.value) {
    rememberEditableFieldSelection()

    const targetBlockPath = getNearestBlocksFieldWithSingleChild()?.blockPath ?? blockPath.value
    const duplicateBlockPath = duplicateBlock(targetBlockPath)

    if (duplicateBlockPath) {
      focusEditableField(duplicateBlockPath + props.fieldPath.slice(targetBlockPath.length), getSelection())
      commitData()
    }
  }
}

function onDeleteBlock() {
  if (blockPath?.value) {
    rememberEditableFieldSelection()

    const focusedEditableField = focusNearestEditableField(props.fieldPath)
    const selectedBlock = focusedEditableField ? null : selectNearestBlock(blockPath.value)
    const diff = deleteBlockCascade(blockPath.value)

    if (focusedEditableField && diff[focusedEditableField]) {
      focusEditableField(diff[focusedEditableField])
    } else if (selectedBlock && diff[selectedBlock]) {
      selectBlockAfterMutation(diff[selectedBlock])
    }

    if (!focusedEditableField && !selectedBlock) {
      deselectBlocks()
    }

    commitData()
  }
}

function onDeleteStart(value: string) {
  onDeleteEdge(value, 'start')
}

function onDeleteEnd(value: string) {
  onDeleteEdge(value, 'end')
}

function onDeleteEdge(value: string, edge: 'start' | 'end') {
  if (blockPath?.value && fieldOptions.value?._fieldType === 'richText') {
    const trimmedValue = value.trim()

    rememberEditableFieldSelection()

    if (!trimmedValue && fieldOptions.value.ui.liveEditor.deleteBlockWhenEmpty) {
      let focusedEditableField: string | null = null

      if (edge === 'start') {
        focusedEditableField =
          focusPrevEditableField(props.fieldPath, Infinity) ?? focusNearestEditableField(props.fieldPath, 0)
      } else {
        focusedEditableField =
          focusNextEditableField(props.fieldPath, 0) ?? focusNearestEditableField(props.fieldPath, Infinity)
      }

      const diff = deleteBlockCascade(blockPath.value)

      if (focusedEditableField && diff[focusedEditableField]) {
        focusEditableField(diff[focusedEditableField]!)
      } else {
        deselectBlocks()
      }

      commitData()
      return
    }

    if (
      isArray(fieldOptions.value.ui.liveEditor.mergeGroups) &&
      fieldOptions.value.ui.liveEditor.mergeGroups.length > 0
    ) {
      const domEditableFields = getAllDOMEditableFields()
      const index = domEditableFields.findIndex(({ path }) => path === props.fieldPath)
      const nearestField = edge === 'start' ? domEditableFields[index - 1] : domEditableFields[index + 1]

      if (nearestField) {
        const nearestEditableFieldOptions = parsedFields.value[nearestField.path]

        if (
          nearestEditableFieldOptions?._fieldType === 'richText' &&
          isArray(nearestEditableFieldOptions.ui.liveEditor.mergeGroups) &&
          nearestEditableFieldOptions.ui.liveEditor.mergeGroups.some((group: string) =>
            fieldOptions.value?.ui.liveEditor.mergeGroups.includes(group),
          )
        ) {
          let nearestFieldValue = getProperty<string>(proute.value?.data ?? {}, nearestField.path)

          if (isString(nearestFieldValue)) {
            if (edge === 'start') {
              nearestFieldValue = nearestFieldValue ? nearestFieldValue.replace(/\s*$/, trimmedValue ? ' ' : '') : ''
              updateBlockField(nearestField.path, nearestFieldValue + trimmedValue)
              deleteBlockCascade(blockPath.value)
              focusEditableField(nearestField.path, nearestFieldValue.length)
              commitData()
            } else {
              nearestFieldValue = nearestFieldValue ? nearestFieldValue.replace(/^\s*/, trimmedValue ? ' ' : '') : ''
              updateBlockField(props.fieldPath, trimmedValue + nearestFieldValue)
              deleteBlockCascade(nearestField.path)
              commitData()
            }
          }
        }
      }
    }
  }
}

function onPaste(text: string) {
  if (blockPath?.value) {
    try {
      const json = JSON.parse(text) as PruviousClipboardData

      if (json.pruviousClipboardDataType === 'blocks' && isArray(json.data)) {
        allowDashboardBlockSelection.value = { timestamp: Date.now() + 500, focustFirstEditableField: true }
        rememberEditableFieldSelection()
        messageDashboard('iframe:pasteBlocks', { blockPath: blockPath.value })
      }
    } catch {}
  }
}

async function handleFormatting(newHTML: string, oldHTML: string, newText: string, oldText: string): Promise<boolean> {
  if (blockPath?.value && fieldOptions.value?._fieldType === 'richText') {
    if (newText === '/' && oldText === '' && fieldOptions.value.ui.liveEditor.forwardSlashOpensBlockPicker !== false) {
      const parentBlocksField = parentBlocksFields.value[0]

      if (parentBlocksField?.canHaveMoreChildren() && parentBlocksField.allowedChildBlocks.length > 1) {
        setTimeout(commitData)
        messageDashboard('iframe:addBlock', { blockPath: blockPath.value, position: 'self' })
        return true
      }
    }

    if (isArray(fieldOptions.value.ui.liveEditor.formatters)) {
      for (const formatter of fieldOptions.value.ui.liveEditor.formatters as RichTextFormatter[]) {
        const result = formatter({ newHTML, oldHTML, newText, oldText }) as any

        if (result) {
          await nextTick()
          commitData()

          if (
            fieldOptions.value?._fieldType === 'richText' &&
            listInfo.value &&
            listInfo.value.listContentField.blockName === result.$key &&
            isArray(result[listInfo.value.listContentField.fieldName]) &&
            result[listInfo.value.listContentField.fieldName].length === 1
          ) {
            const { listContentField, listItemContentField } = listInfo.value
            const prevSibling = listItemContentField.fieldData[listItemContentField.index - 1]
            const nextSibling = listItemContentField.fieldData[listItemContentField.index + 1]
            const resultListItem = result[listInfo.value.listContentField.fieldName][0]

            if (prevSibling && prevSibling.$key === listContentField.blockName) {
              // Merge with previous sibling list
              const prevSiblingContentField = resolveBlocksField(
                `${listItemContentField.fieldPath}.${listItemContentField.index - 1}.${listContentField.fieldName}`,
              )

              if (prevSiblingContentField?.canHaveMoreChildren()) {
                const newIndex = prevSiblingContentField.fieldData.length
                const newListItemBlock = insertBlock(prevSiblingContentField.fieldPath, newIndex, resultListItem)

                if (newListItemBlock) {
                  deleteBlockCascade(props.fieldPath)
                  focusEditableField(`${prevSiblingContentField.fieldPath}.${newIndex}.*`, Infinity)
                  focusEditableFieldAfterMutation(`${prevSiblingContentField.fieldPath}.${newIndex}.*`, Infinity)
                  setTimeout(commitData)
                }

                return true
              }
            }

            if (nextSibling && nextSibling.$key === listContentField.blockName) {
              // Merge with next sibling list
              const nextSiblingContentField = resolveBlocksField(
                `${listItemContentField.fieldPath}.${listItemContentField.index + 1}.${listContentField.fieldName}`,
              )

              if (nextSiblingContentField?.canHaveMoreChildren()) {
                const newListItemBlock = insertBlock(nextSiblingContentField.fieldPath, 0, resultListItem)

                if (newListItemBlock) {
                  focusEditableField(`${nextSiblingContentField.fieldPath}.0.*`, Infinity)
                  focusEditableFieldAfterMutation(`${nextSiblingContentField.fieldPath}.0.*`, Infinity)

                  const diff = deleteBlockCascade(props.fieldPath)

                  for (const [oldPath, newPath] of Object.entries(diff)) {
                    if (oldPath.startsWith(`${nextSiblingContentField.fieldPath}.0.`)) {
                      const dots = nextSiblingContentField.fieldPath.split('.').length + 1
                      const basePath = newPath.split('.').slice(0, dots).join('.')
                      focusEditableField(`${basePath}.*`, Infinity)
                      focusEditableFieldAfterMutation(`${basePath}.*`, Infinity)
                      break
                    }
                  }

                  setTimeout(commitData)
                }

                return true
              }
            }

            if (!prevSibling && listContentField.index > 0) {
              // Merge with previous list item
              const prevListItemBlockPath = `${listContentField.fieldPath}.${listContentField.index - 1}`
              const prevListItemContentField = resolveBlocksField(
                `${prevListItemBlockPath}.${listContentField.fieldName}`,
              )

              if (prevListItemContentField) {
                const lastBlockInPrevListItem = last(prevListItemContentField.fieldData)

                // Check if last block in previous list item is a list
                if (lastBlockInPrevListItem && lastBlockInPrevListItem.$key === listContentField.blockName) {
                  const lastBlockInPrevListItemContentField = resolveBlocksField(
                    `${prevListItemContentField.fieldPath}.${prevListItemContentField.fieldData.length - 1}.${listContentField.fieldName}`,
                  )

                  if (lastBlockInPrevListItemContentField?.canHaveMoreChildren()) {
                    const newIndex = lastBlockInPrevListItemContentField.fieldData.length
                    const newListItemBlock = insertBlock(
                      lastBlockInPrevListItemContentField.fieldPath,
                      newIndex,
                      resultListItem,
                    )

                    if (newListItemBlock) {
                      deleteBlockCascade(props.fieldPath)
                      focusEditableField(`${lastBlockInPrevListItemContentField.fieldPath}.${newIndex}.*`, Infinity)
                      focusEditableFieldAfterMutation(
                        `${lastBlockInPrevListItemContentField.fieldPath}.${newIndex}.*`,
                        Infinity,
                      )
                      setTimeout(commitData)
                      return true
                    }
                  }
                }

                if (prevListItemContentField.canHaveMoreChildren()) {
                  const newIndex = prevListItemContentField.fieldData.length
                  const newListBlock = insertBlock(prevListItemContentField.fieldPath, newIndex, result)

                  if (newListBlock) {
                    deleteBlockCascade(props.fieldPath)
                    focusEditableField(`${prevListItemContentField.fieldPath}.${newIndex}.*`, Infinity)
                    focusEditableFieldAfterMutation(`${prevListItemContentField.fieldPath}.${newIndex}.*`, Infinity)
                    setTimeout(commitData)
                  }

                  return true
                }
              }
            }
          }

          if (replaceBlock(blockPath.value, result)) {
            focusEditableField(`${blockPath.value}.*`, Infinity)
            focusEditableFieldAfterMutation(`${blockPath.value}.*`, Infinity)
            setTimeout(commitData)
            return true
          }
        }
      }
    }
  }

  return false
}

function getListInfo(listItemBlockPath: string | undefined) {
  if (blockPath?.value && listItemBlockPath) {
    const listItemContentField = parentBlocksFields.value[0]!
    const listContentField = parentBlocksFields.value[1]!
    const listParentBlocksField = parentBlocksFields.value[2]
    const listGrandParentBlocksField = parentBlocksFields.value[3]

    if (!listItemContentField || !listContentField) {
      return null
    }

    return {
      listBlockPath: listContentField.blockPath,
      listContentField,
      listItemBlockPath,
      listItemContentField,
      listParentBlocksField,
      listGrandParentBlocksField,
    }
  }

  return null
}
</script>
