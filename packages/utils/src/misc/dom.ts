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
