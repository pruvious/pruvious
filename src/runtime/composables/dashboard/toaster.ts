import { useState, type Ref } from '#imports'
import DOMPurify from 'dompurify'

export interface ToasterItem {
  message: string
  type?: 'success' | 'error' | 'info'
  afterRouteChange?: boolean
}

/**
 * The current Pruvious toaster state.
 */
export const usePruviousToaster: () => Ref<Required<ToasterItem> | null> = () =>
  useState('pruvious-toaster', () => null)

/**
 * Show a toaster message.
 */
export function pruviousToasterShow(item: ToasterItem) {
  usePruviousToaster().value = {
    message: DOMPurify.sanitize(item.message)
      .replace(/\*\*([^*]*(?:\*(?!\*)[^*]*)*)\*\*/g, '<strong class="text-white">$1</strong>')
      .replace(/\!\!([^!]*(?:\!(?!\!)[^!]*)*)\!\!/g, '<strong class="text-white">$1</strong>'),
    type: item.type || 'info',
    afterRouteChange: item.afterRouteChange ?? false,
  }
}
