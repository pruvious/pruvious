import type { Mark } from '../../server/fields/richText'

/**
 * Identifier for a built-in common mark.
 */
export type CommonMark = 'bold' | 'italic' | 'underline' | 'code' | 'strikethrough' | 'subscript' | 'superscript'

/**
 * A collection of commonly used marks for rich text editors with their default settings.
 *
 * Use all marks, pick specific ones, or mix with custom marks.
 *
 * @example
 * ```ts
 * import { commonMarks, richTextField } from '#pruvious/server'
 *
 * // Use all common marks
 * richTextField({ marks: commonMarks })
 *
 * // Pick specific marks
 * richTextField({
 *   marks: {
 *     bold: commonMarks.bold,
 *     italic: commonMarks.italic,
 *   },
 * })
 *
 * // Mix with custom marks
 * richTextField({
 *   marks: {
 *     ...commonMarks,
 *     highlight: {
 *       tag: 'span',
 *       attrs: { class: 'highlight' },
 *       icon: 'highlight',
 *       label: 'Highlight',
 *     },
 *   },
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
  italic: {
    tag: 'em',
    parseTags: ['i'],
    shortcut: 'Mod-i',
    icon: 'italic',
    label: ({ __ }) => __('pruvious-dashboard', 'Italic'),
  },
  underline: {
    tag: 'u',
    shortcut: 'Mod-u',
    icon: 'underline',
    label: ({ __ }) => __('pruvious-dashboard', 'Underline'),
  },
  code: {
    tag: 'code',
    shortcut: 'Mod-e',
    icon: 'code',
    label: ({ __ }) => __('pruvious-dashboard', 'Code'),
  },
  strikethrough: {
    tag: 's',
    parseTags: ['del', 'strike'],
    icon: 'strikethrough',
    label: ({ __ }) => __('pruvious-dashboard', 'Strikethrough'),
  },
  subscript: {
    tag: 'sub',
    icon: 'subscript',
    label: ({ __ }) => __('pruvious-dashboard', 'Subscript'),
  },
  superscript: {
    tag: 'sup',
    icon: 'superscript',
    label: ({ __ }) => __('pruvious-dashboard', 'Superscript'),
  },
}
