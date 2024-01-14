import { useState, type Ref } from '#imports'
import DOMPurify from 'dompurify'
import { __ } from '../translatable-strings'

export interface PruviousDialog {
  message: string
  resolveLabel: string
  rejectLabel: string
}

/**
 * The current dialog.
 */
export const usePruviousDialog: () => Ref<PruviousDialog | null> = () => useState('pruvious-dialog', () => null)

/**
 * Show a dialog popup.
 */
export async function pruviousDialog(
  message: string,
  labels?: { resolve?: string; reject?: string },
): Promise<boolean> {
  const dialog = usePruviousDialog()

  dialog.value = {
    message: DOMPurify.sanitize(message)
      .replace(/\*\*([^*]*(?:\*(?!\*)[^*]*)*)\*\*/g, '<strong class="text-primary-700">$1</strong>')
      .replace(/\!\!([^!]*(?:\!(?!\!)[^!]*)*)\!\!/g, '<strong class="text-amber-600">$1</strong>'),
    resolveLabel: labels?.resolve ?? __('pruvious-dashboard', 'Yes'),
    rejectLabel: labels?.reject ?? __('pruvious-dashboard', 'No'),
  }

  return new Promise((resolve) => {
    window.addEventListener('pruvious-dialog' as any, (event: CustomEvent) => resolve(event.detail), {
      once: true,
    })
  })
}
