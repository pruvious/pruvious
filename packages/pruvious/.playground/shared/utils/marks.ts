import type { Mark } from '#pruvious/server'

type CommonMark = 'bold'

/**
 * A collection of commonly used marks for rich text editors with their default settings.
 *
 * Use these marks directly or as a starting point for your own custom marks.
 *
 * @example
 * ```ts
 * import { richTextField } from '#pruvious/app'
 *
 * defineProps({
 *   content: richTextField({
 *     marks: {
 *       ...commonMarks.bold,
 *       ...commonMarks.italic,
 *       ...commonMarks.underline,
 *       myCustomMark: {
 *         // ...
 *       },
 *     },
 *   })
 * })
 * ```
 */
export const commonMarks: Record<CommonMark, Mark> = {
  bold: {
    tag: 'strong',
    parseTags: ['b'],
    shortcut: 'Mod-b',
    icon: 'bold',
    label: ({ __ }) => __('pruvious-dashboard', 'Bold'),
  },
}
