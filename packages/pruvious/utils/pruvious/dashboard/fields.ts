import { __, dashboardBasePath, maybeTranslate } from '#pruvious/client'
import type { GenericFieldUIOptions } from '#pruvious/server'
import { isDefined, isFunction, isObject, titleCase } from '@pruvious/utils'

interface ResolvedFieldDescriptionBase {
  /**
   * The type of the resolved description.
   */
  type: 'simple' | 'expandable'
}

interface ResolvedFieldDescriptionSimple extends ResolvedFieldDescriptionBase {
  type: 'simple'

  /**
   * The resolved HTML string.
   */
  html: string
}

interface ResolvedFieldDescriptionExpandable extends ResolvedFieldDescriptionBase {
  type: 'expandable'

  /**
   * The resolved HTML content of the expandable description.
   */
  text: string

  /**
   * The resolved label text for the "Show description" button.
   */
  showLabel: string

  /**
   * The resolved label text for the "Hide description" button.
   */
  hideLabel: string

  /**
   * Specifies whether the content is initially expanded.
   */
  expanded: boolean
}

type ResolvedFieldDescription = ResolvedFieldDescriptionSimple | ResolvedFieldDescriptionExpandable

/**
 * Gets the final label text for a field by checking the `ui.label` option.
 *
 * If no `ui.label` is defined, converts the `fieldName` to Title Case format and uses it as the label.
 * Such label text is processed through the translation function __('pruvious-dashboard', label).
 */
export function resolveFieldLabel(label: GenericFieldUIOptions['label'], fieldName: string): string {
  return isDefined(label) ? maybeTranslate(label) : __('pruvious-dashboard', titleCase(fieldName, false) as any)
}

/**
 * Processes and converts the `ui.description` field option into a formatted HTML string.
 *
 * @returns an object
 */
export function resolveFieldDescription(
  description: GenericFieldUIOptions['description'],
): ResolvedFieldDescription | null {
  if (isDefined(description)) {
    if (isObject(description) && !isFunction(description)) {
      const { showLabel, hideLabel, text, expanded } = description
      return {
        type: 'expandable',
        text: puiMarkdown(maybeTranslate(text), { basePath: dashboardBasePath }),
        showLabel: isDefined(showLabel) ? maybeTranslate(showLabel) : __('pruvious-dashboard', 'Show description'),
        hideLabel: isDefined(hideLabel) ? maybeTranslate(hideLabel) : __('pruvious-dashboard', 'Hide description'),
        expanded: expanded ?? false,
      }
    } else {
      return { type: 'simple', html: puiMarkdown(maybeTranslate(description) ?? '', { basePath: dashboardBasePath }) }
    }
  }

  return null
}
