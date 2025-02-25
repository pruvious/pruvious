import { useState, type Ref } from '#imports'
import { useEventListener } from '@vueuse/core'
import type { BlocksRepeaterItem } from '../../utils/dashboard/block-tree'
import { __ } from '../translatable-strings'
import { pruviousToasterShow } from './toaster'

export type PruviousClipboard = {
  pruviousClipboardType: 'block'
  payload: BlocksRepeaterItem
}

/**
 * The current clipboard state.
 */
export const usePruviousClipboard: () => Ref<PruviousClipboard | null> = () =>
  useState('pruvious-clipboard', () => null)

/**
 * Copy something to the clipboard.
 * Also keeps the pruvious clipboard state in sync.
 */
export async function copyToClipboard(type: PruviousClipboard['pruviousClipboardType'], payload: any) {
  const text = JSON.stringify({ pruviousClipboardType: type, payload })
  setClipboardState(text)

  await navigator.clipboard
    .writeText(text)
    .then(() => pruviousToasterShow({ message: __('pruvious-dashboard', 'Copied') }))
    .catch((error) => pruviousToasterShow({ message: error.toString(), type: 'error' }))
}

/**
 * Set the pruvious clipboard state from a string.
 * Called when:
 *  - writing to the clipboard (to keep the in-app clipboard state in sync)
 *  - receiving a paste event from an external source
 * @param text 
 */
export function setClipboardState(text: string) {
  const value = JSON.parse(text)

  if (value.pruviousClipboardType) {
    usePruviousClipboard().value = value
  }
}

/**
 * Override the default paste behavior.
 * Get the clipboard text from a paste event and prevent the default action.
 * @param e 
 */
export function useClipboardText(e: ClipboardEvent) {
  const text = e.clipboardData?.getData('text/plain')

  if (text) {
    e.preventDefault()
  }

  return text
}