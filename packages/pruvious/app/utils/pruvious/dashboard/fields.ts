import { __ } from '#pruvious/app/i18n'
import { dashboardBasePath } from '#pruvious/dashboard/base'
import type { GenericFieldUIOptions, GenericSerializableFieldOptions } from '#pruvious/server'
import type { WhereField as _WhereField, Operator } from '@pruvious/orm'
import { puiMarkdown } from '@pruvious/ui/pui/html'
import { isDefined, isFunction, isObject, stripHTML, titleCase } from '@pruvious/utils'
import { maybeTranslate } from './i18n'

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

export type WhereField = Omit<_WhereField, 'operator'> & { $key: string; operator: FilterOperator }

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
  | 'notContainsI'
  | 'includes'
  | 'includesAny'
  | 'excludes'
  | 'excludesAny'

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
  notContainsI: 'notIlike',
  includes: 'includes',
  includesAny: 'includesAny',
  excludes: 'excludes',
  excludesAny: 'excludesAny',
}

/**
 * Provides a reactive object that caches sanitized versions of field value labels.
 * When a label is accessed for the first time, it is sanitized using the `stripHTML` function and stored in the cache.
 */
export const useSanitizedFieldValueLabels = () => {
  const state = useState<Record<string, string>>('pruvious-sanitized-field-value-labels', () => ({}))

  return new Proxy(state.value, {
    get: (target, key: string) => {
      if (!(key in target)) {
        const brIndex = key.indexOf('<br>')
        target[key] = stripHTML(brIndex > -1 ? key.slice(0, brIndex) : key)
      }
      return target[key]
    },
  })
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
 * Resolves the column header label for a field in a dashboard data table.
 *
 * The priority is:
 *
 * 1. The column-level `label` (when explicitly set on the column entry).
 * 2. The field's `ui.dataTable.label` (data-table-specific override; currently
 *    supported on `object` and `nullableObject` fields).
 * 3. The field's `ui.label`.
 * 4. The field name converted to Title Case as the fallback.
 */
export function resolveTableColumnLabel(
  fieldName: string,
  fieldOptions: GenericSerializableFieldOptions | undefined,
  columnLabel?: GenericFieldUIOptions['label'],
): string {
  if (isDefined(columnLabel)) {
    return maybeTranslate(columnLabel)
  }

  const ui = fieldOptions?.ui as
    | (GenericFieldUIOptions & { dataTable?: { label?: GenericFieldUIOptions['label'] } })
    | undefined
  const dataTableLabel = isObject(ui?.dataTable) ? ui.dataTable.label : undefined

  if (isDefined(dataTableLabel)) {
    return maybeTranslate(dataTableLabel)
  }

  return resolveFieldLabel(ui?.label, fieldName)
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
  _dataType,
}: GenericSerializableFieldOptions): { value: FilterOperator; label: string }[] {
  const choices: { value: FilterOperator; label: string }[] = [
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
    { value: 'notContainsI', label: __('pruvious-dashboard', 'Does not contain (case-insensitive)') },
  ]

  if (_dataType === 'text') {
    return choices.filter(({ value }) =>
      [
        'eq',
        'eqi',
        'ne',
        'startsWith',
        'startsWithI',
        'endsWith',
        'endsWithI',
        'contains',
        'containsI',
        'notContains',
        'notContainsI',
      ].includes(value),
    )
  }

  if (_dataType === 'boolean') {
    return choices.filter(({ value }) => ['eq', 'ne'].includes(value))
  }

  if (_dataType === 'junction' || _dataType === 'matrix') {
    return choices.filter(({ value }) =>
      ['lt', 'lte', 'gt', 'gte', 'includes', 'includesAny', 'excludes', 'excludesAny'].includes(value),
    )
  }

  return choices.filter(({ value }) => ['eq', 'ne', 'lt', 'lte', 'gt', 'gte'].includes(value))
}
