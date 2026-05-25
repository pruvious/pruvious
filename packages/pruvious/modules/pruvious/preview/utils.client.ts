import type {
  DashboardLanguageCode,
  GenericRouteReference,
  GenericSerializableFieldOptions,
  SerializableBlock,
} from '#pruvious/server'
import { useEventListener, useMutationObserver } from '@vueuse/core'
import { isPreview } from '../routes/composable'
import {
  deleteBlock,
  deleteBlockCascade,
  deselectBlocks,
  duplicateBlock,
  insertBlock,
  insertSiblingBlock,
  moveBlock,
  replaceBlock,
  selectBlock,
  selectBlockAfterMutation,
  selectNearestBlock,
  selectNextBlock,
  selectPrevBlock,
  updateBlockField,
} from './utils/block-management'
import { resolveAllParentBlocksFields, resolveBlocksField, resolveParentBlocksField } from './utils/blocks-field'
import {
  getAllDOMBlocks,
  getAllDOMEditableFields,
  getAncestorDOMBlocks,
  getDOMBlock,
  onBlur,
  onClick,
  onFocus,
  onFocusIn,
  onMouseDown,
  onMouseOut,
  onMouseOver,
  onMutation,
  resolveFocusedBlocks,
  resolveHighlightedBlocks,
  scrollToElement,
  type DOMBlock,
} from './utils/dom'
import { onKeyDown } from './utils/hotkeys'
import { maybeTranslate } from './utils/i18n'
import { commitData, commitDataDebounced, messageDashboard, onDashboardMessage } from './utils/messages'
import {
  focusEditableField,
  focusEditableFieldAfterMutation,
  focusNearestEditableField,
  focusNextEditableField,
  focusPrevEditableField,
  type EditableTextNextFocus,
} from './utils/rich-text'
import { redo, rememberBlockSelection, rememberEditableFieldSelection, undo, usePreviewState } from './utils/state'

export interface UsePreview {
  /**
   * Indicates whether the current route path is being viewed in preview mode.
   */
  isPreview: Ref<boolean>

  /**
   * Indicates whether the user can edit blocks and fields in the preview iframe.
   */
  isEditable: Ref<boolean>

  /**
   * Indicates whether the preview iframe is currently focused.
   */
  isFocused: Ref<boolean>

  /**
   * The current dashboard language code.
   */
  dashboardLanguage: Ref<DashboardLanguageCode>

  /**
   * Collections and singletons that can be referenced in routes.
   */
  routeReferences: Ref<Record<string, Omit<GenericRouteReference, 'publicFields'>>>

  /**
   * Serialized field definitions of the current collection.
   */
  fields: Ref<Record<string, GenericSerializableFieldOptions>>

  /**
   * Serialized field definitions representing the `routing.publicFields` of the collection.
   */
  publicFields: Ref<Record<string, GenericSerializableFieldOptions>>

  /**
   * A flat object containing all field definitions from the current route data.
   *
   * Field paths use dot notation for nested fields.
   */
  parsedFields: Ref<Record<string, GenericSerializableFieldOptions>>

  /**
   * Serialized block definitions.
   */
  blocks: Ref<Record<string, SerializableBlock>>

  /**
   * Translated labels for blocks in the preview, where keys are block names and values are the labels.
   */
  blockLabels: Ref<Record<string, string>>

  /**
   * The currently highlighted blocks in the preview iframe.
   * The array is ordered from parent to child (ancestors first, descendants later).
   */
  highlightedBlocks: Ref<DOMBlock[]>

  /**
   * The currently focused blocks in the preview iframe.
   * The array is ordered from parent to child (ancestors first, descendants later).
   */
  focusedBlocks: Ref<DOMBlock[]>

  /**
   * The field path of an editable field that should be focused next within the next 500 milliseconds.
   */
  editableTextNextFocus: Ref<EditableTextNextFocus | null>

  /**
   * Executes a translatable string callback or returns the provided string.
   *
   * Translatable string callbacks are used for translating field option values, usually in the UI.
   * They are anonymous functions that receive an object with `_` and `__` properties to access the translation functions.
   * The language is automatically resolved from the `useLanguage()` composable.
   *
   * @example
   * ```ts
   * // String
   * maybeTranslate('First Name') // 'First Name'
   *
   * // Function
   * maybeTranslate(({ _ }) => _('First Name')) // 'Vorname'
   * ```
   */
  maybeTranslate: typeof maybeTranslate

  /**
   * Posts a message from the preview iframe to the parent dashboard window.
   */
  messageDashboard: typeof messageDashboard

  /**
   * Resolves a `blocksField({})` at the specified `blocksFieldPath`.
   *
   * Returns field and block information, along with the list of blocks that can be nested inside.
   */
  resolveBlocksField: typeof resolveBlocksField

  /**
   * Finds and resolves the parent `blocksField({})` for a given `childBlockPath` (or nested field path).
   *
   * Returns field and block information, along with the list of blocks that can be nested inside.
   */
  resolveParentBlocksField: typeof resolveParentBlocksField

  /**
   * Finds and resolves all parent `blocksField({})` instances for a given `childBlockPath` (or nested field path).
   *
   * The returned array is ordered from the nearest parent to the farthest ancestor.
   */
  resolveAllParentBlocksFields: typeof resolveAllParentBlocksFields

  /**
   * Inserts a new block at a specified `index` in a `target` path.
   *
   * The `target` can be either the path to a `blocksField({})` field, or a block or field inside that `blocksField({})`.
   * In the latter case, the new block will be inserted in the nearest parent `blocksField({})` of the `target`, if possible.
   */
  insertBlock: typeof insertBlock

  /**
   * Inserts a new block before or after a `target` path.
   *
   * The `target` can be either the path to a block, or a field inside that block.
   * In the latter case, the new block will be inserted before or after the block that contains the `target`, if possible.
   */
  insertSiblingBlock: typeof insertSiblingBlock

  /**
   * Moves the block located at the `target` path by the specified `offset`.
   *
   * The `target` can be either the path to a block, or a field inside that block.
   * In the latter case, the block that contains the `target` will be moved.
   *
   * Returns the new path of the moved block, or `null` if the block couldn't be moved.
   */
  moveBlock: typeof moveBlock

  /**
   * Updates the value of a field at the specified path in the route data of the preview.
   */
  updateBlockField: typeof updateBlockField

  /**
   * Duplicates a block at the specified `target` path.
   *
   * The `target` can be either the path to a block, or a field inside that block.
   * In the latter case, the block that contains the `target` will be duplicated.
   *
   * Returns the path of the newly duplicated block, or `null` if the block couldn't be duplicated.
   */
  duplicateBlock: typeof duplicateBlock

  /**
   * Replaces a block at the specified `target` path with a new block.
   *
   * The `target` can be either the path to a block, or a field inside that block.
   * In the latter case, the block that contains the `target` will be replaced.
   *
   * Returns the casted block data of the newly replaced block, or `null` if the block couldn't be replaced.
   */
  replaceBlock: typeof replaceBlock

  /**
   * Deletes a block at the specified `target` path.
   *
   * The `target` can be either the path to a block, or a field inside that block.
   * In the latter case, the block that contains the `target` will be deleted.
   *
   * Returns an object mapping old paths to new paths for blocks that moved after deletion.
   */
  deleteBlock: typeof deleteBlock

  /**
   * Deletes a block at the specified `target` path, along with all its parent blocks with no other children.
   *
   * The `target` can be either the path to a block, or a field inside that block.
   * In this case, the block that contains the `target` will be deleted, along with all its parent blocks that have no other children.
   *
   * Returns an object mapping old paths to new paths for blocks that moved after deletion.
   */
  deleteBlockCascade: typeof deleteBlockCascade

  /**
   * Sends the current route data to the dashboard.
   */
  commitData: typeof commitData

  /**
   * Sends the current route data to the dashboard after a short delay.
   * Each subsequent call to this function within the delay period resets the delay,
   * ensuring that updates are sent only after changes have settled for at least 250 milliseconds.
   */
  commitDataDebounced: typeof commitDataDebounced

  /**
   * Reverts the last change in the preview by going back one step in the dashboard's change history.
   */
  undo: typeof undo

  /**
   * Reapplies the last reverted change in the preview by going forward one step in the dashboard's change history.
   */
  redo: typeof redo

  /**
   * Selects a block in the dashboard's block tree using its dot-notated `target` path.
   *
   * You can also pass a `target` path to a field inside the block.
   * In this case, the parent block will be selected.
   */
  selectBlock: typeof selectBlock

  /**
   * Selects a block in the iframe and dashboard after a mutation that changed the block's path.
   */
  selectBlockAfterMutation: typeof selectBlockAfterMutation

  /**
   * Moves focus to the previous block before the one at `target` path.
   * Blocks are resolved in the order they appear in the DOM.
   *
   * The `target` can be either the path to a block, or a field inside that block.
   *
   * Returns the path of the selected block, or `null` if no block could be selected.
   */
  selectPrevBlock: typeof selectPrevBlock

  /**
   * Moves focus to the next block after the one at `target` path.
   * Blocks are resolved in the order they appear in the DOM.
   *
   * The `target` can be either the path to a block, or a field inside that block.
   *
   * Returns the path of the selected block, or `null` if no block could be selected.
   */
  selectNextBlock: typeof selectNextBlock

  /**
   * Selects the previous sibling block of the given `target` path.
   * If there's no previous sibling, selects the next sibling.
   * If there are no siblings, selects the nearest parent block.
   *
   * The `target` can be either the path to a block, or a field inside that block.
   *
   * Returns the path of the selected block, or `null` if no block could be selected.
   */
  selectNearestBlock: typeof selectNearestBlock

  /**
   * Unfocuses all currently focused blocks in the preview iframe and deselects all selected blocks in the dashboard.
   */
  deselectBlocks: typeof deselectBlocks

  /**
   * Saves the currently focused block in the preview iframe.
   * This allows the same block to be focused again after navigating through history (undo/redo).
   */
  rememberBlockSelection: typeof rememberBlockSelection

  /**
   * Saves the cursor position and text selection of the active editable field.
   * This allows the selection to be restored when navigating through history (undo/redo).
   */
  rememberEditableFieldSelection: typeof rememberEditableFieldSelection

  /**
   * Schedules an editable field to receive focus within the next 500 milliseconds.
   * Use `fieldPath.*` to focus any field starting with `fieldPath.`.
   */
  focusEditableField: typeof focusEditableField

  /**
   * Schedules an editable field to receive focus within the next 500 milliseconds, after a mutation that may have changed the field's path.
   * Use `fieldPath.*` to focus any field starting with `fieldPath.`.
   */
  focusEditableFieldAfterMutation: typeof focusEditableFieldAfterMutation

  /**
   * Moves focus to the previous editable field before the one at `fieldPath`.
   * Fields are resolved in the order they appear in the DOM.
   *
   * The `fieldPath` must be the path to an editable field, not a block or a non-editable field.
   *
   * Automatically selects the block containing the newly focused field.
   *
   * Returns the path of the focused field, or `null` if no field could be focused.
   */
  focusPrevEditableField: typeof focusPrevEditableField

  /**
   * Moves focus to the next editable field after the one at `fieldPath`.
   * Fields are resolved in the order they appear in the DOM.
   *
   * The `fieldPath` must be the path to an editable field, not a block or a non-editable field.
   *
   * Automatically selects the block containing the newly focused field.
   *
   * Returns the path of the focused field, or `null` if no field could be focused.
   */
  focusNextEditableField: typeof focusNextEditableField

  /**
   * Focuses the previous sibling editable field of the given `fieldPath`.
   * If there's no previous sibling editable field, focuses the next sibling.
   * If there are no siblings, moves up to the parent block and looks for editable fields there.
   *
   * The `fieldPath` must be the path to an editable field, not a block or a non-editable field.
   *
   * Automatically selects the block containing the newly focused field.
   *
   * Returns the path of the focused field, or `null` if no field could be focused.
   */
  focusNearestEditableField: typeof focusNearestEditableField

  /**
   * Updates the `focusedBlocks` state based on the provided `target` element.
   * This function is typically called in response to focus and mouse events to keep track of which blocks are currently focused.
   */
  resolveFocusedBlocks: typeof resolveFocusedBlocks

  /**
   * Updates the `highlightedBlocks` state based on the provided `target` element.
   * This function is typically called in response to mouseover and mouseout events to keep track of which blocks are currently highlighted.
   */
  resolveHighlightedBlocks: typeof resolveHighlightedBlocks

  /**
   * Finds and returns the DOM element of a block based on its dot-notated `blockPath`.
   */
  getDOMBlock: typeof getDOMBlock

  /**
   * Finds and returns all blocks in the DOM.
   * The returned array is ordered like they appear in the DOM.
   */
  getAllDOMBlocks: typeof getAllDOMBlocks

  /**
   * Finds and returns all ancestor blocks of a given `target` element in the DOM.
   * The returned array is ordered from parent to child (ancestors first, descendants later).
   */
  getAncestorDOMBlocks: typeof getAncestorDOMBlocks

  /**
   * Finds and returns all editable fields in the DOM.
   * The returned array is ordered like they appear in the DOM.
   */
  getAllDOMEditableFields: typeof getAllDOMEditableFields

  /**
   * Scrolls the preview iframe to bring the specified target element into view.
   * This is typically used to ensure that a block or field is visible when it is selected or focused.
   */
  scrollToElement: typeof scrollToElement
}

/**
 * Composables and utilities for the Pruvious preview environment.
 *
 * This module provides composables for managing the state of the preview, block manipulation,
 * and communication between the preview iframe and the dashboard.
 */
export function usePreview(): UsePreview {
  const route = useRoute()
  const {
    isEditable,
    isFocused,
    dashboardLanguage,
    routeReferences,
    fields,
    publicFields,
    parsedFields,
    blocks,
    blockLabels,
    highlightedBlocks,
    focusedBlocks,
    editableTextNextFocus,
  } = usePreviewState()

  return {
    isPreview: computed(() => isPreview(route)),
    isEditable,
    isFocused,
    dashboardLanguage,
    routeReferences,
    fields,
    publicFields,
    parsedFields,
    blocks,
    blockLabels,
    highlightedBlocks,
    focusedBlocks,
    editableTextNextFocus,
    maybeTranslate,
    messageDashboard,
    resolveBlocksField,
    resolveParentBlocksField,
    resolveAllParentBlocksFields,
    insertBlock,
    insertSiblingBlock,
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
    selectPrevBlock,
    selectNextBlock,
    selectNearestBlock,
    deselectBlocks,
    rememberBlockSelection,
    rememberEditableFieldSelection,
    focusEditableField,
    focusEditableFieldAfterMutation,
    focusPrevEditableField,
    focusNextEditableField,
    focusNearestEditableField,
    resolveFocusedBlocks,
    resolveHighlightedBlocks,
    getDOMBlock,
    getAllDOMBlocks,
    getAncestorDOMBlocks,
    getAllDOMEditableFields,
    scrollToElement,
  }
}

/**
 * Sets up the Pruvious preview environment to enable communication between the preview iframe (current window) and the dashboard (parent window).
 */
export function initializePreview() {
  if (useNuxtApp().isHydrating) {
    setTimeout(initializePreview, 100)
  } else {
    useEventListener('message', onDashboardMessage)
    useEventListener('focus', onFocus)
    useEventListener('blur', onBlur)
    useEventListener(document, 'focusin', onFocusIn)
    useEventListener('mousedown', onMouseDown)
    useEventListener('touchstart', onMouseDown)
    useEventListener('click', onClick)
    useEventListener('mouseover', onMouseOver)
    useEventListener('mouseout', onMouseOut)
    useEventListener('keydown', onKeyDown)
    messageDashboard('iframe:ready', {})
    useMutationObserver(document.getElementById('__nuxt'), onMutation, { childList: true, subtree: true })
  }
}
