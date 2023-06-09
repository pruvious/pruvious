import { isEditingText } from './dom'

const n = navigator as any

export const platform = n?.userAgentData?.platform || n?.platform || 'unknown'

export const isMac = /mac/i.test(platform)

export function cmdPlus(letter: string, event: KeyboardEvent): boolean {
  if (event.key?.toLowerCase() !== letter.toLowerCase()) {
    return false
  }

  if (isMac && (!event.metaKey || event.shiftKey || event.altKey || event.ctrlKey)) {
    return false
  } else if (!isMac && (!event.ctrlKey || event.shiftKey || event.altKey || event.metaKey)) {
    return false
  }

  return true
}

export function getHotkeyAction(
  event: KeyboardEvent,
): 'copy' | 'cut' | 'duplicate' | 'paste' | 'redo' | 'save' | 'undo' | 'delete' | null {
  const letter = event.key?.toLowerCase() ?? ''

  if (
    !isEditingText() &&
    (((event.key === 'Delete' || event.key === 'Backspace') &&
      !event.metaKey &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.shiftKey) ||
      (isMac &&
        letter === 'd' &&
        event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !event.shiftKey))
  ) {
    return 'delete'
  } else if (isMac && (!event.metaKey || event.altKey || event.ctrlKey)) {
    return null
  } else if (!isMac && (!event.ctrlKey || event.altKey || event.metaKey)) {
    return null
  }

  if (letter === 'y') {
    return event.shiftKey || isEditingText() ? null : 'redo'
  } else if (letter === 'z') {
    if (isEditingText()) {
      return null
    } else {
      return isMac && event.shiftKey ? 'redo' : event.shiftKey ? null : 'undo'
    }
  } else if (letter === 'd') {
    if (!event.shiftKey && !isEditingText()) {
      return 'duplicate'
    }
  } else if (letter === 'c') {
    if (!event.shiftKey && !isEditingText()) {
      return 'copy'
    }
  } else if (letter === 'x') {
    if (!event.shiftKey && !isEditingText()) {
      return 'cut'
    }
  } else if (letter === 'v') {
    if (!event.shiftKey && !isEditingText()) {
      return 'paste'
    }
  } else if (letter === 's') {
    if (!event.shiftKey) {
      return 'save'
    }
  }

  return null
}
