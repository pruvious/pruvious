import type { BlockName } from '#pruvious/server'
import { isString } from '@pruvious/utils'
import { useClipboard, useEventListener, type UseClipboardReturn } from '@vueuse/core'
import { getUser } from '../../../modules/pruvious/auth/utils.client'

export type PruviousClipboardData =
  | {
      pruviousClipboardDataType: 'blocks'
      data: ({ $key: BlockName } & Record<string, any>)[]
    }
  | {
      pruviousClipboardDataType: 'structure-item'
      data: { $type: string } & Record<string, any>
    }

let _clipboard: UseClipboardReturn<true>

const usePruviousClipboardSource = () => useState<string>('pruvious-clipboard-source', () => 'null')

/**
 * Composable that provides reactive clipboard data for Pruvious objects.
 */
export const usePruviousClipboardData = () =>
  useState<PruviousClipboardData | null>('pruvious-clipboard-data', () => null)

/**
 * Reactive clipboard API that provides the ability to respond to clipboard commands (cut, copy, and paste).
 */
export function usePruviousClipboard() {
  const { text, copy: _copy, copied } = initClipboard()

  return {
    copy: (data: PruviousClipboardData | null) => {
      usePruviousClipboardData().value = data
      _copy(JSON.stringify(data))
    },
    copied,
    data: computed<PruviousClipboardData | null>(() => {
      if (text.value) {
        try {
          const parsed = JSON.parse(text.value) as PruviousClipboardData
          if (isString(parsed.pruviousClipboardDataType)) {
            return parsed
          }
        } catch {}
      }
      return null
    }),
  }
}

function initClipboard() {
  if (!_clipboard) {
    const source = usePruviousClipboardSource()
    const user = getUser()

    _clipboard = useClipboard({ source })

    if (user?.smartClipboard) {
      useEventListener(window, 'focus', inspectClipboard)
      inspectClipboard()
    }
  }

  return _clipboard
}

async function inspectClipboard() {
  try {
    const text = await navigator.clipboard.readText()
    const parsed = JSON.parse(text) as PruviousClipboardData
    if (isString(parsed.pruviousClipboardDataType)) {
      usePruviousClipboardData().value = parsed
    }
  } catch {}
}
