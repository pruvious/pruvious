import type { DirectiveBinding } from "#imports"

interface PastingHTMLElement extends HTMLElement {
  pasteTarget?: HTMLElement
}

type OnPasteCallback = (event: ClipboardEvent) => void

export const vOnPaste = {
  mounted(el: PastingHTMLElement, binding: DirectiveBinding<OnPasteCallback>) {
    const target = document.createElement('div')
    target.contentEditable = 'true'
    target.style.position = 'absolute'
    target.style.top = '0'
    target.style.left = '0'
    target.style.width = '0'
    target.style.height = '0'
    target.style.opacity = '0'

    target.addEventListener('paste', (event) => {
      event.preventDefault()
      event.stopPropagation()
      binding.value(event)
    })

    el.pasteTarget = target
    el.appendChild(target)

    el.addEventListener('keydown', (_) => {
      target.focus()
    })

    el.addEventListener('contextmenu', (_) => {
      target.focus()
    })
  },
  unmounted(el: PastingHTMLElement) {
    if (el.pasteTarget) {
      el.pasteTarget.remove()
    }
  }
}