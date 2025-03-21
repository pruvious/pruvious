import { dashboardBasePath } from '#pruvious/client/base'
import { __ } from '#pruvious/client/i18n'
import type { GenericFieldUIOptions, GenericSerializableFieldOptions } from '#pruvious/server'
import type { Operator } from '@pruvious/orm'
import { isDefined, isFunction, isObject, titleCase } from '@pruvious/utils'
import { maybeTranslate } from '../../../modules/pruvious/translations/utils.client'

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

export type FilterOperator =
  | 'eq'
  | 'eqi'
  | 'ne'
  | 'lt'
  | 'lte'
  | 'gt'
  | 'gte'
  | 'startsWith'
  | 'startsWithI'
  | 'endsWith'
  | 'endsWithI'
  | 'contains'
  | 'containsI'
  | 'notContains'

export const filterOperatorsMap: Record<FilterOperator, Operator> = {
  eq: '=',
  eqi: 'ilike',
  ne: '!=',
  lt: '<',
  lte: '<=',
  gt: '>',
  gte: '>=',
  startsWith: 'like',
  startsWithI: 'ilike',
  endsWith: 'like',
  endsWithI: 'ilike',
  contains: 'like',
  containsI: 'ilike',
  notContains: 'notLike',
}

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

/**
 * Gets a list of valid filter operators that can be used with a field based on its options.
 * The operators are determined by analyzing the field's data type.
 */
export function getValidFilterOperators({
  __dataType,
}: GenericSerializableFieldOptions): { value: FilterOperator; label: string }[] {
  const allOperators: { value: FilterOperator; label: string }[] = [
    { value: 'eq', label: __('pruvious-dashboard', 'Equals') },
    { value: 'eqi', label: __('pruvious-dashboard', 'Equals (case-insensitive)') },
    { value: 'ne', label: __('pruvious-dashboard', 'Does not equal') },
    { value: 'lt', label: __('pruvious-dashboard', 'Less than') },
    { value: 'lte', label: __('pruvious-dashboard', 'Less than or equal to') },
    { value: 'gt', label: __('pruvious-dashboard', 'Greater than') },
    { value: 'gte', label: __('pruvious-dashboard', 'Greater than or equal to') },
    { value: 'startsWith', label: __('pruvious-dashboard', 'Starts with') },
    { value: 'startsWithI', label: __('pruvious-dashboard', 'Starts with (case-insensitive)') },
    { value: 'endsWith', label: __('pruvious-dashboard', 'Ends with') },
    { value: 'endsWithI', label: __('pruvious-dashboard', 'Ends with (case-insensitive)') },
    { value: 'contains', label: __('pruvious-dashboard', 'Contains') },
    { value: 'containsI', label: __('pruvious-dashboard', 'Contains (case-insensitive)') },
    { value: 'notContains', label: __('pruvious-dashboard', 'Does not contain') },
  ]

  if (__dataType === 'text') {
    return allOperators.filter(({ value }) => !['lt', 'lte', 'gt', 'gte'].includes(value))
  }

  if (__dataType === 'boolean') {
    return allOperators.filter(({ value }) => ['eq', 'ne'].includes(value))
  }

  return allOperators.filter(({ value }) => ['eq', 'ne', 'lt', 'lte', 'gt', 'gte'].includes(value))
}
