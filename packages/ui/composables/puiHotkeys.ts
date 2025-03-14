import { remove } from '@pruvious/utils'
import { useEventListener } from '@vueuse/core'

export type PUIHotkeyAction =
  | 'close'
  | 'copy'
  | 'cut'
  | 'delete'
  | 'duplicate'
  | 'moveDown'
  | 'moveUp'
  | 'paste'
  | 'redo'
  | 'save'
  | 'selectAll'
  | 'undo'

export interface PUIHotkeys {
  /**
   * Indicates whether the hotkey listener is active.
   *
   * @default true
   */
  isListening: Ref<boolean>

  /**
   * Specifies whether hotkeys are allowed when an overlay is active.
   *
   * @default false
   */
  allowInOverlay: Ref<boolean>

  /**
   * Registers a callback for a keyboard shortcut.
   * The listener is automatically removed in Vue components when they are unmounted.
   *
   * @param action - The action to listen for.
   * @param callback - The callback to invoke when the action is triggered.
   *
   * @returns a function to stop listening for the action.
   *
   * @example
   * ```ts
   * const { listen } = usePUIHotkeys()
   *
   * const stop = listen('save', (event) => {
   *   event.preventDefault()
   *   // Save the document
   * })
   * ```
   */
  listen: (action: PUIHotkeyAction, callback: (event: KeyboardEvent) => void) => () => void

  /**
   * Pauses listening for keyboard shortcuts.
   */
  pause: () => void

  /**
   * Resumes listening for keyboard shortcuts.
   */
  resume: () => void
}

/**
 * Composable for managing keyboard shortcuts.
 *
 * @param listen - Whether to start listening for keyboard shortcuts immediately (default: `true`).
 *
 * @example
 * ```ts
 * const { listen } = usePUIHotkeys()
 * ```
 */
export function usePUIHotkeys(listen = true): PUIHotkeys {
  const isListening = ref(listen)
  const listeners = new Map<PUIHotkeyAction, ((event: KeyboardEvent) => void)[]>()
  const mac = puiIsMac()
  const overlayCounter = usePUIOverlayCounter()
  const allowInOverlay = ref(false)

  let currentOverlay = -1

  nextTick(() => {
    setTimeout(() => {
      currentOverlay = overlayCounter.value
    })
  })

  /**
   * The function to stop listening for keyboard shortcuts.
   */
  let stop: (() => void) | undefined

  /**
   * Watches the `isListening` ref and starts or stops listening for keyboard shortcuts.
   */
  watch(
    isListening,
    (value) => {
      if (value) {
        stop = useEventListener(inject('popup', document), 'keydown', onKeyDown)
      } else {
        stop?.()
      }
    },
    { immediate: true },
  )

  /**
   * Handles the `keydown` event and triggers the appropriate actions.
   */
  function onKeyDown(event: KeyboardEvent) {
    if (event.defaultPrevented) {
      return
    }

    const letter = event.key?.toLowerCase() ?? ''
    const disabled =
      document.body.classList.contains('pui-no-interaction') ||
      (overlayCounter.value > 0 && (!allowInOverlay.value || overlayCounter.value !== currentOverlay))

    if (
      !puiIsEditingText() &&
      !disabled &&
      (((event.key === 'Delete' || event.key === 'Backspace') &&
        !event.metaKey &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.shiftKey) ||
        (mac && letter === 'd' && event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey))
    ) {
      return listeners.get('delete')?.forEach((callback) => callback(event))
    } else if (
      !puiIsEditingText() &&
      !disabled &&
      event.key === 'Escape' &&
      !event.metaKey &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.shiftKey
    ) {
      return listeners.get('close')?.forEach((callback) => callback(event))
    } else if (mac && (!event.metaKey || event.altKey || event.ctrlKey)) {
      return
    } else if (!mac && (!event.ctrlKey || event.altKey || event.metaKey)) {
      return
    }

    if (letter === 'y') {
      return event.shiftKey || puiIsEditingText() || disabled
        ? undefined
        : listeners.get('redo')?.forEach((callback) => callback(event))
    } else if (letter === 'z') {
      if (puiIsEditingText() || disabled) {
        return
      } else {
        return mac && event.shiftKey
          ? listeners.get('redo')?.forEach((callback) => callback(event))
          : event.shiftKey
            ? null
            : listeners.get('undo')?.forEach((callback) => callback(event))
      }
    } else if (letter === 'a') {
      if (!event.shiftKey && !puiIsEditingText() && !disabled) {
        return listeners.get('selectAll')?.forEach((callback) => callback(event))
      }
    } else if (letter === 'd') {
      if (!event.shiftKey && !puiIsEditingText() && !disabled) {
        return listeners.get('duplicate')?.forEach((callback) => callback(event))
      }
    } else if (letter === 'c') {
      if (!event.shiftKey && !puiIsEditingText() && !disabled) {
        return listeners.get('copy')?.forEach((callback) => callback(event))
      }
    } else if (letter === 'x') {
      if (!event.shiftKey && !puiIsEditingText() && !disabled) {
        return listeners.get('cut')?.forEach((callback) => callback(event))
      }
    } else if (letter === 'v') {
      if (!event.shiftKey && !puiIsEditingText() && !disabled) {
        return listeners.get('paste')?.forEach((callback) => callback(event))
      }
    } else if (letter === 's') {
      if (!event.shiftKey) {
        return listeners.get('save')?.forEach((callback) => callback(event))
      }
    } else if (letter === 'arrowup' || letter === 'arrowdown') {
      if (!event.shiftKey && !puiIsEditingText() && !disabled) {
        return listeners.get(letter === 'arrowup' ? 'moveUp' : 'moveDown')?.forEach((callback) => callback(event))
      }
    }
  }

  return {
    isListening,
    allowInOverlay,
    listen: (action, callback) => {
      if (!listeners.has(action)) {
        listeners.set(action, [])
      }

      const callbacks = listeners.get(action)!
      callbacks.push(callback)

      return () => {
        remove(callback, callbacks, true)
      }
    },
    resume: () => (isListening.value = true),
    pause: () => (isListening.value = false),
  }
}

/**
 * Checks if the user is currently editing an input field.
 */
export function puiIsEditingText() {
  let el = document.activeElement

  while (el && el.tagName !== 'BODY') {
    if (
      (el.tagName === 'INPUT' && el.getAttribute('type') !== 'checkbox') ||
      el.tagName === 'TEXTAREA' ||
      el.hasAttribute('contenteditable')
    ) {
      return true
    }

    el = el.parentElement
  }

  return false
}

/**
 * Checks if any modifier key is pressed.
 */
export function puiHasModifierKey(event: KeyboardEvent) {
  return event.metaKey || event.ctrlKey || event.altKey || event.shiftKey
}

/**
 * Checks if the user is on a Mac by inspecting the user agent.
 * This is used to determine the correct modifier key for keyboard shortcuts.
 */
export function puiIsMac() {
  const n = navigator as any
  const platform = n?.userAgentData?.platform || n?.platform || 'unknown'
  return /mac/i.test(platform)
}

/**
 * Returns the labels for the default hotkeys (e.g., `Cmd + S` for save).
 */
export function puiGetHotkeyLabels() {
  const mac = puiIsMac()
  const metaKey = mac ? 'Cmd' : 'Ctrl'

  return {
    close: 'Esc',
    copy: `${metaKey} + C`,
    cut: `${metaKey} + X`,
    delete: 'Del',
    duplicate: `${metaKey} + D`,
    moveDown: `${metaKey} + ↓`,
    moveUp: `${metaKey} + ↑`,
    paste: `${metaKey} + V`,
    redo: mac ? `${metaKey} + Shift + Z` : `${metaKey} + Y`,
    save: `${metaKey} + S`,
    selectAll: `${metaKey} + A`,
    undo: `${metaKey} + Z`,
  }
}
