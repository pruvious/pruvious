import { parseFields } from '../../fields/utils.client'
import type {
  DashboardLanguageCode,
  GenericRouteReference,
  GenericSerializableFieldOptions,
  ResolvedRoute,
  SerializableBlock,
} from '#pruvious/server'
import { deepClone, omit } from '@pruvious/utils'
import { useDebounceFn, useEventListener } from '@vueuse/core'
import { hash } from 'ohash'
import { deserializeTranslatableStringCallbacks, usePruviousDashboard } from '../../pruvious/utils.client'
import { usePruviousRoute } from '../../routes/composable'
import { preloadTranslatableStrings } from '../../translations/utils.client'
import { selectBlock, selectBlockAfterMutation } from './block-management'
import { getDOMBlock, resolveFocusedBlocks, resolveHighlightedBlocks, scrollToElement } from './dom'
import { focusEditableField, focusEditableFieldAfterMutation } from './rich-text'
import { rememberBlockSelection, rememberEditableFieldSelection, updateDataHash, usePreviewState } from './state'

export type IframeMessage =
  | IframeMessageReady
  | IframeMessageToast
  | IframeMessageData
  | IframeMessageFocus
  | IframeMessageBlur
  | IframeMessageSave
  | IframeMessageUndo
  | IframeMessageRedo
  | IframeAddBlock
  | IframeSelectBlock
  | IframeCopyBlock
  | IframeCutBlock
  | IframePasteBlocks

export interface IframeMessageReady {
  name: 'iframe:ready'
}

export interface IframeMessageToast {
  name: 'iframe:toast'
  type?: 'default' | 'success' | 'error' | 'info' | 'warning'
  title?: string
  message: string
}

export interface IframeMessageData {
  name: 'iframe:data'
  data: Omit<ResolvedRoute['data'], '_casted'>
}

export interface IframeMessageFocus {
  name: 'iframe:focus'
}

export interface IframeMessageBlur {
  name: 'iframe:blur'
}

export interface IframeMessageSave {
  name: 'iframe:save'
}

export interface IframeMessageUndo {
  name: 'iframe:undo'
}

export interface IframeMessageRedo {
  name: 'iframe:redo'
}

export interface IframeAddBlock {
  name: 'iframe:addBlock'
  blockPath: string | null
  position: 'before' | 'after' | 'inside' | 'self'
}

export interface IframeSelectBlock {
  name: 'iframe:selectBlock'
  blockPath: string | null
}

export interface IframeCopyBlock {
  name: 'iframe:copyBlock'
  blockPath: string
}

export interface IframeCutBlock {
  name: 'iframe:cutBlock'
  blockPath: string
}

export interface IframePasteBlocks {
  name: 'iframe:pasteBlocks'
  blockPath: string | null
}

export type DashboardMessage =
  | DashboardMessageSetup
  | DashboardMessageData
  | DashboardMessageHistory
  | DashboardMessageReload
  | DashboardHighlightBlock
  | DashboardFocusBlock
  | DashboardRestoreFocus
  | DashboardAllowBlockSelection

export interface DashboardMessageSetup {
  name: 'dashboard:setup'
  isEditable: boolean
  dashboardLanguage: DashboardLanguageCode
  fields: Record<string, GenericSerializableFieldOptions>
  publicFields: Record<string, GenericSerializableFieldOptions>
  blocks: Record<string, SerializableBlock>
  blockLabels: Record<string, string>
  routeReferences: Record<string, Omit<GenericRouteReference, 'publicFields'>>
  route: ResolvedRoute
  historyIndex: number
  historySize: number
}

export interface DashboardMessageData {
  name: 'dashboard:data'
  data: ResolvedRoute['data']
  historyIndex: number
  historySize: number
  focusBlock?: string | null
}

export interface DashboardMessageHistory {
  name: 'dashboard:history'
  historyIndex: number
  historySize: number
}

export interface DashboardMessageReload {
  name: 'dashboard:reload'
}

export interface DashboardHighlightBlock {
  name: 'dashboard:highlightBlock'
  blockPath: string | null
}

export interface DashboardFocusBlock {
  name: 'dashboard:focusBlock'
  blockPath: string | null
}

export interface DashboardRestoreFocus {
  name: 'dashboard:restoreFocus'
}

export interface DashboardAllowBlockSelection {
  name: 'dashboard:allowBlockSelection'
  focustFirstEditableField?: boolean
}

export function messageDashboard<TName extends IframeMessage['name']>(
  name: TName,
  data: Omit<Extract<IframeMessage, { name: TName }>, 'name'>,
) {
  window.parent.postMessage({ name, ...data }, window.location.origin)
}

export function commitData() {
  const proute = usePruviousRoute()
  const { historyIndex, historySize, isCommitting, dataHash } = usePreviewState()

  if (proute.value) {
    const data = omit(deepClone(proute.value.data), ['_casted'])
    const newDataHash = hash(data)

    if (newDataHash !== dataHash.value) {
      historyIndex.value = historyIndex.value + 1
      rememberBlockSelection()
      rememberEditableFieldSelection()
      historySize.value = historyIndex.value + 1
      messageDashboard('iframe:data', { data })
      dataHash.value = newDataHash
    }
  }

  isCommitting.value = false
}

const _commitDataDebounced = useDebounceFn(commitData, 250)

export function commitDataDebounced() {
  const { isCommitting } = usePreviewState()
  isCommitting.value = true
  _commitDataDebounced()
}

export function onDashboardMessage(event: MessageEvent<DashboardMessage>) {
  if (event.origin === window.location.origin) {
    if (event.data.name === 'dashboard:setup') {
      onDashboardSetup(event.data)
    } else if (event.data.name === 'dashboard:data') {
      onDashboardDataUpdate(event.data)
    } else if (event.data.name === 'dashboard:history') {
      onDashboardHistoryStateUpdate(event.data)
    } else if (event.data.name === 'dashboard:reload') {
      window.location.reload()
    } else if (event.data.name === 'dashboard:highlightBlock') {
      onDashboardHighlightBlock(event.data)
    } else if (event.data.name === 'dashboard:focusBlock') {
      onDashboardFocusBlock(event.data)
    } else if (event.data.name === 'dashboard:restoreFocus') {
      onDashboardRestoreFocus()
    } else if (event.data.name === 'dashboard:allowBlockSelection') {
      onAllowBlockSelection(event.data.focustFirstEditableField)
    }
  }
}

function onDashboardSetup(data: Extract<DashboardMessage, { name: 'dashboard:setup' }>) {
  const proute = usePruviousRoute()
  const dashboard = usePruviousDashboard()
  const {
    isEditable,
    dashboardLanguage,
    routeReferences,
    fields,
    publicFields,
    parsedFields,
    blocks,
    blockLabels,
    historyIndex,
    historySize,
  } = usePreviewState()

  isEditable.value = data.isEditable
  dashboardLanguage.value = data.dashboardLanguage
  routeReferences.value = data.routeReferences
  fields.value = deserializeTranslatableStringCallbacks(data.fields)
  publicFields.value = deserializeTranslatableStringCallbacks(data.publicFields)
  blocks.value = deserializeTranslatableStringCallbacks(data.blocks)
  dashboard.value = { blocks: blocks.value } as any
  blockLabels.value = data.blockLabels
  proute.value = data.route
  parsedFields.value = parseFields(publicFields.value, proute.value.data._casted ?? {})
  historyIndex.value = data.historyIndex
  historySize.value = data.historySize

  updateDataHash()
  preloadTranslatableStrings('pruvious-dashboard', dashboardLanguage.value)
}

function onDashboardDataUpdate(data: Extract<DashboardMessage, { name: 'dashboard:data' }>) {
  const proute = usePruviousRoute()
  const {
    isFocused,
    publicFields,
    parsedFields,
    historyIndex,
    historySize,
    blocksSelectionHistory,
    editableFieldsSelectionHistory,
    allowDashboardBlockSelection,
    isCommitting,
  } = usePreviewState()

  if (isCommitting.value || !proute.value) {
    return
  }

  proute.value.data = data.data
  parsedFields.value = parseFields(publicFields.value, proute.value.data._casted ?? {})
  historyIndex.value = data.historyIndex
  historySize.value = data.historySize

  updateDataHash()

  console.log({
    blocksSelectionHistory: deepClone(blocksSelectionHistory.value),
    editableFieldsSelectionHistory: deepClone(editableFieldsSelectionHistory.value),
    focusBlock: data.focusBlock,
    allowDashboardBlockSelection: allowDashboardBlockSelection.value,
  })

  if (
    data.focusBlock &&
    allowDashboardBlockSelection.value &&
    allowDashboardBlockSelection.value.timestamp > Date.now()
  ) {
    const { timestamp, focustFirstEditableField } = allowDashboardBlockSelection.value
    const focusFn = () => {
      if (timestamp > Date.now()) {
        selectBlock(data.focusBlock!, focustFirstEditableField)
        selectBlockAfterMutation(data.focusBlock!, focustFirstEditableField)
        focusEditableField(`${data.focusBlock}.*`, Infinity)
        focusEditableFieldAfterMutation(`${data.focusBlock}.*`, Infinity)
        rememberBlockSelection()
        rememberEditableFieldSelection()
      }
    }

    if (isFocused.value) {
      focusFn()
    } else {
      useEventListener('focus', focusFn, { once: true })
    }

    allowDashboardBlockSelection.value = null
  } else if (editableFieldsSelectionHistory.value[historyIndex.value]) {
    const { fieldPath, selection } = editableFieldsSelectionHistory.value[historyIndex.value]!
    focusEditableField(fieldPath, selection)
    focusEditableFieldAfterMutation(fieldPath, selection)
  } else if (blocksSelectionHistory.value[historyIndex.value]) {
    selectBlock(blocksSelectionHistory.value[historyIndex.value]!)
    selectBlockAfterMutation(blocksSelectionHistory.value[historyIndex.value]!)
  }
}

function onDashboardHistoryStateUpdate(data: Extract<DashboardMessage, { name: 'dashboard:history' }>) {
  const { historyIndex, historySize } = usePreviewState()
  historyIndex.value = data.historyIndex
  historySize.value = data.historySize
}

function onDashboardHighlightBlock(data: Extract<DashboardMessage, { name: 'dashboard:highlightBlock' }>) {
  if (data.blockPath) {
    const domBlock = getDOMBlock(data.blockPath)

    if (domBlock) {
      resolveHighlightedBlocks(domBlock.el)
    }
  } else {
    resolveHighlightedBlocks(null)
  }
}

function onDashboardFocusBlock(data: Extract<DashboardMessage, { name: 'dashboard:focusBlock' }>) {
  const { isFocused } = usePreviewState()

  if (!isFocused.value) {
    if (data.blockPath) {
      const domBlock = getDOMBlock(data.blockPath)

      if (domBlock) {
        resolveFocusedBlocks(domBlock.el)
        scrollToElement(domBlock.el)
      } else {
        selectBlockAfterMutation(data.blockPath)
      }
    } else {
      resolveFocusedBlocks(null)
    }
  }
}

function onDashboardRestoreFocus() {
  const { isFocused, historyIndex, blocksSelectionHistory, editableFieldsSelectionHistory } = usePreviewState()

  if (!isFocused.value) {
    window.focus()
  }

  if (editableFieldsSelectionHistory.value[historyIndex.value]) {
    const { fieldPath, selection } = editableFieldsSelectionHistory.value[historyIndex.value]!
    focusEditableField(fieldPath, selection)
  } else if (blocksSelectionHistory.value[historyIndex.value]) {
    selectBlock(blocksSelectionHistory.value[historyIndex.value]!)
  }
}

function onAllowBlockSelection(focustFirstEditableField = false) {
  const { allowDashboardBlockSelection } = usePreviewState()
  allowDashboardBlockSelection.value = { timestamp: Date.now() + 500, focustFirstEditableField }
}
