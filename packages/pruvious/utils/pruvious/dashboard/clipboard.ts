import type { BlockName } from '#pruvious/server'
import { isString } from '@pruvious/utils'
import { useClipboard } from '@vueuse/core'

export type PruviousClipboardData =
  | {
      pruviousClipboardDataType: 'blocks'
      data: ({ $key: BlockName } & Record<string, any>)[]
    }
  | {
      pruviousClipboardDataType: 'structure-item'
      data: Record<string, any>
    }

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
  const source = usePruviousClipboardSource()
  const { text, copy: _copy, copied } = useClipboard({ source })

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
