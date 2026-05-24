import { castToNumber, isNumber, last } from '@pruvious/utils'
import { hash } from 'ohash'
import { usePruviousRoute } from '../../routes/composable'
import type { UsePreview } from '../utils.client'
import { messageDashboard, restorePopulatorPathsToCasted } from './messages'

export function usePreviewState() {
  const isEditable = useState<UsePreview['isEditable']['value']>('pruvious-preview-is-editable', () => false)
  const isFocused = useState<UsePreview['isFocused']['value']>('pruvious-preview-is-focused', () => false)
  const dashboardLanguage = useState<UsePreview['dashboardLanguage']['value']>(
    'pruvious-preview-dashboard-language',
    () => 'en',
  )
  const routeReferences = useState<UsePreview['routeReferences']['value']>(
    'pruvious-preview-route-references',
    () => ({}),
  )
  const fields = useState<UsePreview['fields']['value']>('pruvious-preview-fields', () => ({}))
  const publicFields = useState<UsePreview['publicFields']['value']>('pruvious-preview-public-fields', () => ({}))
  const parsedFields = useState<UsePreview['parsedFields']['value']>('pruvious-preview-parsed-fields', () => ({}))
  const blocks = useState<UsePreview['blocks']['value']>('pruvious-preview-blocks', () => ({}))
  const blockLabels = useState<UsePreview['blockLabels']['value']>('pruvious-preview-block-labels', () => ({}))
  const highlightedBlocks = useState<UsePreview['highlightedBlocks']['value']>(
    'pruvious-preview-highlighted-blocks',
    () => [],
  )
  const focusedBlocks = useState<UsePreview['focusedBlocks']['value']>('pruvious-preview-focused-blocks', () => [])
  const editableTextNextFocus = useState<UsePreview['editableTextNextFocus']['value']>(
    'pruvious-preview-editable-text-next-focus',
    () => null,
  )
  const mutationCallbacks = useState<((mutations: MutationRecord[]) => boolean)[]>(
    'pruvious-preview-mutation-callbacks',
    () => [],
  )
  const historyIndex = useState<number>('pruvious-preview-history-index', () => -1)
  const historySize = useState<number>('pruvious-preview-history-size', () => 0)
  const blocksSelectionHistory = useState<string[]>('pruvious-preview-blocks-selection-history', () => [])
  const editableFieldsSelectionHistory = useState<{ fieldPath: string; selection: { from: number; to: number } }[]>(
    'pruvious-preview-editable-fields-selection-history',
    () => [],
  )
  const allowDashboardBlockSelection = useState<{ timestamp: number; focustFirstEditableField: boolean } | null>(
    'pruvious-preview-allow-dashboard-block-selection',
    () => null,
  )
  const isCommitting = useState<boolean>('pruvious-preview-is-committing', () => false)
  const dataHash = useState<string>('pruvious-preview-data-hash', () => '')

  return {
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
    mutationCallbacks,
    historyIndex,
    historySize,
    blocksSelectionHistory,
    editableFieldsSelectionHistory,
    allowDashboardBlockSelection,
    isCommitting,
    dataHash,
  }
}

export function updateDataHash() {
  const proute = usePruviousRoute()
  const { dataHash, parsedFields } = usePreviewState()

  if (proute.value) {
    dataHash.value = hash(restorePopulatorPathsToCasted(proute.value.data, parsedFields.value))
  }
}

export function undo() {
  const { historyIndex } = usePreviewState()
  if (historyIndex.value > 0) {
    messageDashboard('iframe:undo', {})
  }
}

export function redo() {
  const { historyIndex, historySize } = usePreviewState()
  if (historyIndex.value < historySize.value - 1) {
    messageDashboard('iframe:redo', {})
  }
}

export function rememberBlockSelection() {
  const { focusedBlocks, historyIndex, blocksSelectionHistory } = usePreviewState()
  const focusedBlock = last(focusedBlocks.value)

  if (focusedBlock) {
    blocksSelectionHistory.value[historyIndex.value] = focusedBlock.path
  }
}

export function rememberEditableFieldSelection() {
  const { editableTextNextFocus, historyIndex, editableFieldsSelectionHistory } = usePreviewState()

  if (editableTextNextFocus.value && editableTextNextFocus.value.timestamp + 500 > Date.now()) {
    const { path, selection } = editableTextNextFocus.value
    editableFieldsSelectionHistory.value[historyIndex.value] = {
      fieldPath: path,
      selection: isNumber(selection) ? { from: selection, to: selection } : (selection ?? { from: 0, to: 0 }),
    }
  } else {
    const fieldPath = document.activeElement?.getAttribute('data-field-path')

    if (fieldPath && document.activeElement!.classList.contains('p-rich-text')) {
      const selection = document.activeElement!.getAttribute('data-selection')?.split(',').map(castToNumber) as
        | [number, number]
        | undefined

      if (selection?.length === 2 && selection.every(isNumber)) {
        editableFieldsSelectionHistory.value[historyIndex.value] = {
          fieldPath,
          selection: { from: selection[0], to: selection[1] },
        }
      } else {
        editableFieldsSelectionHistory.value[historyIndex.value] = {
          fieldPath,
          selection: { from: 0, to: 0 },
        }
      }
    }
  }
}
