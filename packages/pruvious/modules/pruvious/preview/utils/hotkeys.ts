import { puiIsEditingText, puiIsMac } from '@pruvious/ui/pui/hotkeys'
import { last } from '@pruvious/utils'
import {
  deleteBlock,
  deselectBlocks,
  duplicateBlock,
  moveBlock,
  selectBlock,
  selectBlockAfterMutation,
  selectNearestBlock,
} from './block-management'
import { commitData, messageDashboard } from './messages'
import { redo, rememberBlockSelection, undo, usePreviewState } from './state'

export function onKeyDown(event: KeyboardEvent) {
  if (event.defaultPrevented) {
    return
  }

  const { focusedBlocks } = usePreviewState()
  const letter = event.key?.toLowerCase() ?? ''
  const mac = puiIsMac()
  const nearestBlock = last(focusedBlocks.value)

  if (
    (event.key === 'Delete' && !event.metaKey && !event.altKey && !event.ctrlKey && !event.shiftKey) ||
    (event.key === 'Backspace' && !event.altKey && !event.shiftKey) ||
    (mac && letter === 'd' && event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey)
  ) {
    if (!puiIsEditingText() && nearestBlock) {
      event.preventDefault()
      onDeleteNearestBlock()
    }
    return
  } else if (event.key === 'Enter' && !event.altKey) {
    if (nearestBlock) {
      onAddBlock(event, event.shiftKey ? 'before' : 'after')
      return
    }
  } else if (event.key === 'Escape' && !event.altKey) {
    onSelectParentBlock()
    return
  } else if (mac && (!event.metaKey || event.altKey || event.ctrlKey)) {
    return
  } else if (!mac && (!event.ctrlKey || event.altKey || event.metaKey)) {
    return
  }

  if (letter === 'y') {
    if (!event.shiftKey && !puiIsEditingText()) {
      event.preventDefault()
      redo()
    }
  } else if (letter === 'z') {
    if (!puiIsEditingText()) {
      event.preventDefault()
      if (mac && event.shiftKey) {
        redo()
      } else if (!event.shiftKey) {
        undo()
      }
    }
  } else if (letter === 'd') {
    if (!event.shiftKey) {
      event.preventDefault()
      onDuplicateNearestBlock()
    }
  } else if (letter === 'c') {
    if (!event.shiftKey && !puiIsEditingText() && nearestBlock) {
      event.preventDefault()
      rememberBlockSelection()
      messageDashboard('iframe:copyBlock', { blockPath: nearestBlock.path })
    }
  } else if (letter === 'x') {
    if (!event.shiftKey && !puiIsEditingText() && nearestBlock) {
      event.preventDefault()
      onCutBlock()
    }
  } else if (letter === 'v') {
    if (!event.shiftKey && !puiIsEditingText()) {
      event.preventDefault()
      onPasteBlocks()
    }
  } else if (letter === 's') {
    if (!event.shiftKey) {
      event.preventDefault()
      messageDashboard('iframe:save', {})
    }
  } else if (letter === 'arrowup' || letter === 'arrowdown') {
    if (!event.shiftKey && nearestBlock) {
      event.preventDefault()
      onMoveBlock(letter === 'arrowup' ? -1 : 1)
    }
  }
}

function onDeleteNearestBlock() {
  const { focusedBlocks } = usePreviewState()
  const nearestBlock = last(focusedBlocks.value)

  if (nearestBlock) {
    rememberBlockSelection()

    const selectedBlock = selectNearestBlock(nearestBlock.path) || deselectBlocks()
    const diff = deleteBlock(nearestBlock.path)

    if (selectedBlock && diff[selectedBlock]) {
      selectBlockAfterMutation(diff[selectedBlock])
    }

    commitData()
  }
}

function onAddBlock(event: KeyboardEvent, position: 'before' | 'after') {
  const { focusedBlocks } = usePreviewState()
  const nearestBlock = last(focusedBlocks.value)

  if (nearestBlock) {
    event.preventDefault()
    rememberBlockSelection()
    messageDashboard('iframe:addBlock', { blockPath: nearestBlock.path, position })
  }
}

function onSelectParentBlock() {
  const { focusedBlocks } = usePreviewState()
  const parentBlock = focusedBlocks.value[focusedBlocks.value.length - 2]

  if (parentBlock) {
    selectBlock(parentBlock.path)
  } else {
    deselectBlocks()
  }
}

function onDuplicateNearestBlock() {
  const { focusedBlocks } = usePreviewState()
  const nearestBlock = last(focusedBlocks.value)

  if (nearestBlock) {
    rememberBlockSelection()

    const duplicatedBlockPath = duplicateBlock(nearestBlock.path)

    if (duplicatedBlockPath) {
      selectBlockAfterMutation(duplicatedBlockPath)
      commitData()
    }
  }
}

function onCutBlock() {
  const { focusedBlocks, historyIndex } = usePreviewState()
  const nearestBlock = last(focusedBlocks.value)

  if (nearestBlock) {
    rememberBlockSelection()

    const selectedBlock = selectNearestBlock(nearestBlock.path) || deselectBlocks()
    const diff = deleteBlock(nearestBlock.path)

    if (selectedBlock && diff[selectedBlock]) {
      selectBlockAfterMutation(diff[selectedBlock])
      historyIndex.value = historyIndex.value + 1
      rememberBlockSelection()
      historyIndex.value = historyIndex.value - 1
    }

    messageDashboard('iframe:cutBlock', { blockPath: nearestBlock.path })
  }
}

function onPasteBlocks() {
  const { focusedBlocks, allowDashboardBlockSelection } = usePreviewState()
  const nearestBlock = last(focusedBlocks.value)

  allowDashboardBlockSelection.value = { timestamp: Date.now() + 500, focustFirstEditableField: true }

  rememberBlockSelection()
  messageDashboard('iframe:pasteBlocks', { blockPath: nearestBlock?.path ?? null })
}

function onMoveBlock(offset: number) {
  const { focusedBlocks } = usePreviewState()
  const nearestBlock = last(focusedBlocks.value)

  if (nearestBlock) {
    rememberBlockSelection()

    const newBlockPath = moveBlock(nearestBlock.path, offset)

    if (newBlockPath) {
      selectBlockAfterMutation(newBlockPath)
      commitData()
    }
  }
}
