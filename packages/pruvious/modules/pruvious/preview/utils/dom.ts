import type { BlockName } from '#pruvious/server'
import { castToNumber, clearArray, isNumber, last } from '@pruvious/utils'
import { useDebounceFn } from '@vueuse/core'
import { commitData, messageDashboard } from './messages'
import { usePreviewState } from './state'

export interface DOMBlock {
  /**
   * The full path (using dot notation) to the block.
   */
  path: string

  /**
   * The name of the block.
   */
  name: BlockName

  /**
   * The block's root element in the DOM.
   * It always has the `data-block-name` and `data-block-path` attributes.
   */
  el: HTMLElement
}

export interface DOMEditableField {
  /**
   * The full path (using dot notation) to the editable field.
   */
  path: string

  /**
   * The current selection in the editable field.
   */
  selection?: { from: number; to: number }

  /**
   * The editable field's root element in the DOM.
   * It always has the `data-field-path` and `data-is-editable` attributes.
   */
  el: HTMLElement
}

const mutationsQueue: MutationRecord[] = []

export function onFocus() {
  const { isFocused } = usePreviewState()
  isFocused.value = true
  messageDashboard('iframe:focus', {})
}

export function onBlur() {
  const { isFocused, highlightedBlocks } = usePreviewState()
  commitData()
  isFocused.value = false
  highlightedBlocks.value = []
  messageDashboard('iframe:blur', {})
}

export function onFocusIn(event: FocusEvent) {
  const { focusedBlocks } = usePreviewState()
  resolveFocusedBlocks(event.target)
  messageDashboard('iframe:selectBlock', { blockPath: last(focusedBlocks.value)?.path ?? null })
}

export function onMouseDown(event: Event) {
  const { focusedBlocks } = usePreviewState()
  preventLinkNavigation(event)
  resolveFocusedBlocks(event.target)
  messageDashboard('iframe:selectBlock', { blockPath: last(focusedBlocks.value)?.path ?? null })
}

export function onMouseOver(event: MouseEvent) {
  resolveHighlightedBlocks(event.target)
}

export function onMouseOut(event: MouseEvent) {
  resolveHighlightedBlocks(event.target)
}

export function onMutation(mutations: MutationRecord[]) {
  mutationsQueue.push(...mutations)
  execMutationCallbacks()
}

const execMutationCallbacks = useDebounceFn(() => {
  const { mutationCallbacks } = usePreviewState()

  for (let i = 0; i < mutationCallbacks.value.length; i++) {
    if (mutationCallbacks.value[i]!(mutationsQueue)) {
      mutationCallbacks.value.splice(i, 1)
      i--
    }
  }

  clearArray(mutationsQueue)
}, 50)

export function resolveFocusedBlocks(target: Element | EventTarget | null) {
  const { focusedBlocks } = usePreviewState()
  focusedBlocks.value = getAncestorDOMBlocks(target)
}

export function resolveHighlightedBlocks(target: Element | EventTarget | null) {
  const { highlightedBlocks } = usePreviewState()
  highlightedBlocks.value = getAncestorDOMBlocks(target)
}

export function getDOMBlock(blockPath: string): DOMBlock | null {
  const blockEl = document.querySelector<HTMLElement>(`[data-block-path="${blockPath}"]`)

  if (blockEl && blockEl.dataset.blockName) {
    return { path: blockPath, name: blockEl.dataset.blockName as BlockName, el: blockEl }
  }

  return null
}

export function getAllDOMBlocks(): DOMBlock[] {
  const blockEls = document.querySelectorAll<HTMLElement>('[data-block-path]')
  const domBlocks: DOMBlock[] = []

  blockEls.forEach((blockEl) => {
    if (blockEl.dataset.blockName && blockEl.dataset.blockPath) {
      domBlocks.push({ path: blockEl.dataset.blockPath, name: blockEl.dataset.blockName as BlockName, el: blockEl })
    }
  })

  return domBlocks
}

export function getAncestorDOMBlocks(target: Element | EventTarget | null): DOMBlock[] {
  const domBlocks: DOMBlock[] = []

  if (target instanceof HTMLElement) {
    let parent: HTMLElement | null = target

    while (parent && parent !== document.body) {
      if (parent.dataset.blockPath && parent.dataset.blockName) {
        domBlocks.unshift({
          path: parent.dataset.blockPath,
          name: parent.dataset.blockName as BlockName,
          el: parent,
        })
      }
      parent = parent.parentElement
    }
  }

  return domBlocks
}

export function getAllDOMEditableFields(): DOMEditableField[] {
  const editorEls = document.querySelectorAll<HTMLElement>(
    '.p-rich-text[data-field-path]:not([data-is-editable="false"])',
  )
  const editableFields: DOMEditableField[] = []

  editorEls.forEach((blockEl) => {
    const selection = blockEl.dataset.selection?.split(',').map(castToNumber) as [number, number] | undefined
    editableFields.push({
      path: blockEl.dataset.fieldPath!,
      selection:
        selection?.length === 2 && selection.every(isNumber) ? { from: selection[0], to: selection[1] } : undefined,
      el: blockEl,
    })
  })

  return editableFields
}

export function scrollToElement(el: HTMLElement) {
  const rect = el.getBoundingClientRect()

  if (el.offsetHeight > window.innerHeight) {
    window.scrollTo({ top: Math.max(rect.top + window.scrollY - 32, 0), behavior: 'smooth' })
  } else {
    if (rect.top < 0 || rect.bottom > window.innerHeight) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    } else if (rect.top < 32) {
      window.scrollTo({ top: Math.max(rect.top + window.scrollY - 32, 0), behavior: 'smooth' })
    } else {
      window.scrollTo({ top: window.scrollY, behavior: 'instant' })
    }
  }
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
