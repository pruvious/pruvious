import { isObject } from '@pruvious/utils'

export function blur(): void {
  const el = document.activeElement as any

  if (isObject(el) && typeof el.blur === 'function') {
    el.blur()
  }
}

export function getNearestScrollContainer(target: HTMLElement): HTMLElement {
  while (target.tagName !== 'BODY') {
    target = target.parentElement!

    if (target.classList.contains('overflow-y-auto')) {
      return target
    }
  }

  return document.body
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

export function isEditingText(): boolean {
  let el = document.activeElement

  while (el && el.tagName !== 'BODY') {
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.hasAttribute('contenteditable')) {
      return true
    }

    el = el.parentElement
  }

  return false
}
