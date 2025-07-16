import type {
  BlockName,
  GenericRouteReference,
  GenericSerializableFieldOptions,
  SerializableBlock,
} from '#pruvious/server'
import { puiIsEditingText, puiIsMac } from '@pruvious/ui/pui/hotkeys'
import { isDefined, last } from '@pruvious/utils'
import { useEventListener } from '@vueuse/core'
import { usePruviousRoute } from '../routes/composable'
import { usePruviousPreviewKey } from './composable'

/**
 * Composable that stores the field paths of the current route data with their corresponding field options.
 */
export const usePruviousPreviewParsedFields = () =>
  useState<Record<string, GenericSerializableFieldOptions>>('pruvious-preview-parsed-fields', () => ({}))

/**
 * Composable that stores the field paths of the currently highlighted blocks in the preview iframe.
 * The array is ordered from parent to child (ancestors first, descendants later).
 */
export const usePruviousPreviewHighlightedBlocks = () =>
  useState<{ path: string; block: BlockName; el: HTMLElement }[]>('pruvious-preview-highlighted-blocks', () => [])

/**
 * Composable that stores the field paths of the currently focused blocks in the preview iframe.
 * The array is ordered from parent to child (ancestors first, descendants later).
 */
export const usePruviousPreviewFocusedBlocks = () =>
  useState<{ path: string; block: BlockName; el: HTMLElement }[]>('pruvious-preview-focused-blocks', () => [])

/**
 * Composable that stores serialized field definitions of the current collection or singleton.
 */
export const usePruviousPreviewFields = () =>
  useState<Record<string, GenericSerializableFieldOptions>>('pruvious-preview-fields', () => ({}))

/**
 * Composable that stores serialized block definitions.
 */
export const usePruviousPreviewBlocks = () =>
  useState<Record<string, SerializableBlock>>('pruvious-preview-blocks', () => ({}))

/**
 * Composable that stores labels for blocks in the preview.
 * The keys are block names, and the values are the labels.
 */
export const usePruviousPreviewBlockLabels = () =>
  useState<Record<string, string>>('pruvious-preview-block-labels', () => ({}))

/**
 * Composable that stores route references.
 */
export const usePruviousPreviewRouteReferences = () =>
  useState<Record<string, Omit<GenericRouteReference, 'publicFields'>>>('pruvious-preview-route-references', () => ({}))

/**
 * Composable that stores the editable state of the current collection or singleton fields.
 */
export const usePruviousPreviewIsEditable = () => useState<boolean>('pruvious-preview-editable', () => false)

/**
 * Composable that stores the field path of the editable field that should be focused next within the next 500 milliseconds.
 */
export const usePruviousPreviewFocusNext = () =>
  useState<{ path: string; timestamp: number } | null>('pruvious-preview-focus-next', () => null)

/**
 * Composable that stores the current dashboard language code.
 */
export const usePruviousPreviewDashboardLanguage = () =>
  useState<string>('pruvious-preview-dashboard-language', () => 'en')

/**
 * Sets up the Pruvious preview environment to enable communication between the preview iframe (current window) and the dashboard (parent window).
 */
export function initializePreview() {
  if (useNuxtApp().isHydrating) {
    setTimeout(initializePreview, 100)
  } else {
    useEventListener('message', onMessage)
    useEventListener('keydown', onKeyDown)
    useEventListener('mousedown', onClick)
    useEventListener('touchstart', onClick)
    useEventListener('mouseover', onMouseOver)
    useEventListener('mouseout', onMouseOut)
    useEventListener(document, 'focusin', onFocusIn)
    useEventListener('blur', onBlur)
    window.parent.postMessage({ name: 'iframe:ready' }, window.location.origin)
  }
}

function onMessage(event: MessageEvent) {
  if (event.origin === window.location.origin) {
    if (event.data.name === 'dashboard:route') {
      const previewKey = usePruviousPreviewKey()
      if (isDefined(previewKey) && previewKey.value === event.data.key) {
        usePruviousPreviewParsedFields().value = event.data.parsedFields
        usePruviousRoute().value = event.data.route
      }
    } else if (event.data.name === 'dashboard:setup') {
      usePruviousPreviewFields().value = event.data.fields
      usePruviousPreviewBlocks().value = event.data.blocks
      usePruviousPreviewBlockLabels().value = event.data.blockLabels
      usePruviousPreviewRouteReferences().value = event.data.routeReferences
      usePruviousPreviewIsEditable().value = event.data.editable
      usePruviousPreviewDashboardLanguage().value = event.data.dashboardLanguage
    } else if (event.data.name === 'dashboard:reload') {
      window.location.reload()
    } else if (event.data.name === 'dashboard:highlightBlock') {
      const el = document.querySelector(`[data-field="${event.data.block}"]`)
      if (el instanceof HTMLElement && el.dataset.block) {
        usePruviousPreviewHighlightedBlocks().value = getBlocksHierarchy({ target: el } as any)
      }
    } else if (event.data.name === 'dashboard:unhighlightBlock') {
      usePruviousPreviewHighlightedBlocks().value = []
    } else if (event.data.name === 'dashboard:focusBlocks') {
      usePruviousPreviewFocusedBlocks().value = event.data.blocks.flatMap((path: string, i: number) => {
        const el = document.querySelector(`[data-field="${path}"]`)
        if (el instanceof HTMLElement && el.dataset.block) {
          if (i === 0) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
          return getBlocksHierarchy({ target: el } as any)
        }
        return []
      })
    } else if (event.data.name === 'dashboard:unfocusBlocks') {
      usePruviousPreviewFocusedBlocks().value = []
    }
  }
}

function onKeyDown(event: KeyboardEvent) {
  if (event.defaultPrevented) {
    return
  }

  const letter = event.key?.toLowerCase() ?? ''
  const mac = puiIsMac()
  const nearestBlock = last(usePruviousPreviewFocusedBlocks().value)

  if (
    ((event.key === 'Delete' || event.key === 'Backspace') &&
      !event.metaKey &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.shiftKey) ||
    (mac && letter === 'd' && event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey)
  ) {
    if (!puiIsEditingText() && nearestBlock) {
      event.preventDefault()
      window.parent.postMessage({ name: 'iframe:deleteBlock', path: nearestBlock.path }, window.location.origin)
    }
    return
  } else if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey && !event.altKey) {
    if (!puiIsEditingText() && nearestBlock) {
      event.preventDefault()
      window.parent.postMessage(
        { name: event.shiftKey ? 'iframe:addBlockBefore' : 'iframe:addBlockAfter', path: nearestBlock.path },
        window.location.origin,
      )
    }
    return
  } else if (mac && (!event.metaKey || event.altKey || event.ctrlKey)) {
    return
  } else if (!mac && (!event.ctrlKey || event.altKey || event.metaKey)) {
    return
  }

  if (letter === 'y') {
    if (!event.shiftKey && !puiIsEditingText()) {
      event.preventDefault()
      window.parent.postMessage({ name: 'iframe:redo' }, window.location.origin)
    }
  } else if (letter === 'z') {
    if (!puiIsEditingText()) {
      event.preventDefault()
      if (mac && event.shiftKey) {
        window.parent.postMessage({ name: 'iframe:redo' }, window.location.origin)
      } else if (!event.shiftKey) {
        window.parent.postMessage({ name: 'iframe:undo' }, window.location.origin)
      }
    }
  } else if (letter === 'd') {
    if (!event.shiftKey) {
      event.preventDefault()
      if (!puiIsEditingText() && nearestBlock) {
        window.parent.postMessage({ name: 'iframe:duplicateBlock', path: nearestBlock.path }, window.location.origin)
      }
    }
  } else if (letter === 'c') {
    if (!event.shiftKey && !puiIsEditingText() && nearestBlock) {
      event.preventDefault()
      window.parent.postMessage({ name: 'iframe:copyBlock', path: nearestBlock.path }, window.location.origin)
    }
  } else if (letter === 'x') {
    if (!event.shiftKey && !puiIsEditingText() && nearestBlock) {
      event.preventDefault()
      window.parent.postMessage({ name: 'iframe:cutBlock', path: nearestBlock.path }, window.location.origin)
    }
  } else if (letter === 'v') {
    if (!event.shiftKey && !puiIsEditingText() && nearestBlock) {
      event.preventDefault()
      window.parent.postMessage({ name: 'iframe:pasteBlocks', path: nearestBlock.path }, window.location.origin)
    }
  } else if (letter === 's') {
    if (!event.shiftKey) {
      event.preventDefault()
      window.parent.postMessage({ name: 'iframe:save' }, window.location.origin)
    }
  }
}

function onClick(event: Event) {
  preventLinkNavigation(event)
  updateFocusedPreviewFields(event)
}

function onMouseOver(event: MouseEvent) {
  updateHighlightedBlocks(event)
}

function onMouseOut(event: MouseEvent) {
  updateHighlightedBlocks(event)
}

function onFocusIn(event: FocusEvent) {
  updateFocusedPreviewFields(event)
}

function onBlur() {
  usePruviousPreviewHighlightedBlocks().value = []
}

function updateFocusedPreviewFields(event: Event) {
  if (event.target instanceof HTMLElement && !event.target.closest('.p-preview-rect')) {
    const blocks = getBlocksHierarchy(event)
    usePruviousPreviewFocusedBlocks().value = blocks
    if (blocks.length) {
      window.parent.postMessage({ name: 'iframe:selectBlock', path: last(blocks)!.path }, window.location.origin)
    } else {
      window.parent.postMessage({ name: 'iframe:deselectBlocks' }, window.location.origin)
    }
  }
}

function updateHighlightedBlocks(event: MouseEvent) {
  if (event.target instanceof HTMLElement && !event.target.closest('.p-preview-rect')) {
    usePruviousPreviewHighlightedBlocks().value = getBlocksHierarchy(event)
  }
}

function getBlocksHierarchy(event: Event): { path: string; block: BlockName; el: HTMLElement }[] {
  const fields: { path: string; block: BlockName; el: HTMLElement }[] = []
  if (event.target instanceof HTMLElement) {
    let parent: HTMLElement | null = event.target
    while (parent && parent !== document.body) {
      if (parent.dataset.field && parent.dataset.block) {
        fields.unshift({
          path: parent.dataset.field,
          block: parent.dataset.block as BlockName,
          el: parent,
        })
      }
      parent = parent.parentElement
    }
  }
  return fields
}

function preventLinkNavigation(event: Event) {
  try {
    let node = event.target as Node | null
    while (node) {
      if (node instanceof HTMLAnchorElement) {
        const linkHref = node.href
        if (!linkHref) {
          event.preventDefault()
          return
        }
        const linkUrl = new URL(linkHref)
        const currentLocation = new URL(window.location.href)
        const isSamePageLink =
          linkUrl.protocol === currentLocation.protocol &&
          linkUrl.host === currentLocation.host &&
          linkUrl.pathname === currentLocation.pathname
        if (isSamePageLink) {
          return
        }
        event.preventDefault()
        return
      }
      node = node.parentNode
    }
  } catch {}
}
