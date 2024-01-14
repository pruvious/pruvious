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
 */
export async function copyToClipboard(type: PruviousClipboard['pruviousClipboardType'], payload: any) {
  await navigator.clipboard
    .writeText(JSON.stringify({ pruviousClipboardType: type, payload }))
    .then(() => pruviousToasterShow({ message: __('pruvious-dashboard', 'Copied') }))
    .catch((error) => pruviousToasterShow({ message: error.toString(), type: 'error' }))

  await checkClipboard()
}

useEventListener('copy', checkClipboard)
useEventListener('focus', checkClipboard)
useEventListener('pruvious-copy' as any, checkClipboard)

async function checkClipboard() {
  try {
    const value = JSON.parse(await navigator.clipboard.readText())

    if (value.pruviousClipboardType) {
      usePruviousClipboard().value = value
      return
    }
  } catch {}

  usePruviousClipboard().value = null
}
