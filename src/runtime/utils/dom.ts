import { isFunction } from './function'

export function blurActiveElement() {
  const el = document.activeElement as HTMLElement

  if (el && isFunction(el.blur)) {
    el.blur()
  }
}

export function isEditingText(): boolean {
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

export function isDropzone(target: HTMLElement): boolean {
  while (target.tagName !== 'BODY') {
    if (target.hasAttribute('data-no-dropzone')) {
      return false
    }

    target = target.parentElement!
  }

  return true
}
