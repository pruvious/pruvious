import { isString } from '@pruvious/utils'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { toast, type ExternalToast } from 'vue-sonner'

export type PUIToastOptions = ExternalToast & {
  /**
   * Defines the visual style of the toast notification based on the message importance level.
   *
   * @default 'default'
   */
  type?: 'default' | 'success' | 'error' | 'info' | 'warning'

  /**
   * Controls if the message content should be processed as Markdown.
   * When enabled, the message text is parsed with [`marked`](https://www.npmjs.com/package/marked)
   * and sanitized through [`DOMPurify`](https://www.npmjs.com/package/dompurify) for safe rendering.
   *
   * @default true
   */
  markdown?: boolean

  /**
   * Whether the toast should be displayed after a route change.
   *
   * @default false
   */
  showAfterRouteChange?: boolean
}

/**
 * Composable that stores a queue of toast notifications.
 * The queue is automatically processed by the `PUIToaster` component.
 */
export const usePUIToasterQueue = () =>
  useState<{ message: string; options?: PUIToastOptions }[]>('pruvious-ui-toaster-queue', () => [])

/**
 * Creates and renders a toast notification with Markdown formatting.
 * Uses the [`vue-sonner`](https://github.com/xiaoluoboding/vue-sonner) library under the hood.
 */
export function puiToast(message: string, options?: PUIToastOptions) {
  const fn = options?.type && options.type !== 'default' ? toast[options.type] : toast
  const md = options?.markdown ?? true

  return fn(markRaw(html(message, md)), {
    ...options,
    class: [
      options?.action ? 'pui-toast-action' : undefined,
      options?.description ? 'pui-toast-description' : undefined,
    ]
      .filter(Boolean)
      .join(' '),
    description: isString(options?.description) ? markRaw(html(options.description, md)) : options?.description,
  })
}

/**
 * Queues a toast notification with Markdown formatting.
 * Uses the [`vue-sonner`](https://github.com/xiaoluoboding/vue-sonner) library under the hood.
 *
 * Call this function to display toast notifications when the `PUIToaster` component is not loaded.
 * The notification will be added to a queue and displayed in order.
 */
export function puiQueueToast(message: string, options?: PUIToastOptions) {
  const queue = usePUIToasterQueue()
  queue.value = [...queue.value, { message, options }]
}

const html = (html: string, markdown = true) =>
  defineComponent({
    setup: () => () =>
      h('div', {
        class: 'pui-prose',
        innerHTML: DOMPurify.sanitize(markdown ? (marked.parse(html) as string) : html),
      }),
  })
