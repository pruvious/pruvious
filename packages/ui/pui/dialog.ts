import { puiMarkdown, puiSanitize } from './html'

export interface PUIDialogOptions<TActions extends PUIDialogAction[]> {
  /**
   * The text content of the dialog.
   *
   * @default undefined
   */
  content?: string

  /**
   * Controls if the `content` should be processed as Markdown.
   * When enabled, the text is parsed with [`marked`](https://www.npmjs.com/package/marked) and sanitized
   * through [`DOMPurify`](https://www.npmjs.com/package/dompurify) for safe rendering.
   *
   * @default true
   */
  markdown?: boolean

  /**
   * An array of action buttons to display in the dialog.
   * Each action button can have a unique `name` that is returned by the `puiDialog` function when the button is clicked.
   */
  actions: TActions

  /**
   * The CSS width of the popup.
   *
   * @default '30rem'
   */
  width?: string
}

export interface PUIDialogAction {
  /**
   * A unique name for the action button.
   * This name is returned by the `puiDialog` function when the action button is clicked.
   */
  name: string

  /**
   * The action button label.
   * If not provided, the `name` is used as the label.
   */
  label?: string

  /**
   * The variant of the action button.
   *
   * @default 'outline'
   */
  variant?: 'primary' | 'secondary' | 'accent' | 'destructive' | 'outline' | 'ghost'
}

type ExtractActionNames<T extends PUIDialogAction[]> = T[number]['name']

/**
 * Composable that stores the current dialog state.
 */
export const usePUIDialog = () =>
  useState<{
    content?: string
    actions: (PUIDialogAction & { resolve: () => void })[]
    width: string
    dismiss: () => void
  } | null>('pruvious-ui-dialog', () => null)

/**
 * Creates and renders a dialog component.
 *
 * @returns a `Promise` that resolves with the name of the action button that was clicked, or `undefined` if the dialog was dismissed.
 *
 * @example
 * ```ts
 * const action = await puiDialog({
 *   content: 'Are you sure you want to delete this item?',
 *   actions: [
 *     { name: 'cancel', label: 'Cancel' },
 *     { name: 'delete', label: 'Delete', variant: 'destructive' },
 *   ],
 * })
 *
 * if (action === 'delete') {
 *   // ...
 * }
 * ```
 */
export async function puiDialog<const TActions extends PUIDialogAction[]>(
  options: PUIDialogOptions<TActions>,
): Promise<ExtractActionNames<TActions> | undefined> {
  return new Promise((resolve) => {
    usePUIDialog().value = {
      content: options.content
        ? options.markdown === false
          ? puiSanitize(options.content)
          : puiMarkdown(options.content)
        : undefined,
      actions: options.actions.map((action) => ({
        ...action,
        label: action.label ?? action.name,
        variant: action.variant ?? 'outline',
        resolve: () => resolve(action.name),
      })),
      width: options.width ?? '30rem',
      dismiss: () => resolve(undefined),
    }
  })
}
