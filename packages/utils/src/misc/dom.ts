/**
 * Checks if an `element` is a descendant of an `ancestor`.
 *
 * @example
 * ```ts
 * const button = document.querySelector('...')
 * const header = document.querySelector('...')
 *
 * isDescendant(button, header) // `true` if the button is inside the header
 * ```
 */
export function isDescendant(element?: HTMLElement, ancestor?: HTMLElement) {
  if (element && ancestor) {
    let node = element.parentNode

    while (node) {
      if (node === ancestor) {
        return true
      }

      node = node.parentNode
    }
  }

  return false
}

/**
 * Blurs the currently focused element.
 *
 * @example
 * ```ts
 * console.log(document.activeElement) // `<input>`
 * blurActiveElement()
 * console.log(document.activeElement) // `<body>`
 * ```
 */
export function blurActiveElement() {
  const activeElement = document.activeElement

  if (activeElement instanceof HTMLElement) {
    activeElement.blur()
  }
}

/**
 * Deselects all text on the page.
 */
export function deselectAll() {
  window.getSelection()?.removeAllRanges()
}

/**
 * Strips HTML tags from a string.
 *
 * Note: This function uses the DOM and should be run in a browser environment.
 *
 * @example
 * ```ts
 * stripHTML('<p>Hello, <strong>World</strong></p>') // 'Hello World'
 * ```
 */
export function stripHTML(html: string) {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent
}
