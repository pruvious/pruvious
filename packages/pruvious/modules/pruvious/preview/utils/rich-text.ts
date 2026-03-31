import { countCommonPrefix } from '@pruvious/utils'
import { getAllDOMEditableFields } from './dom'
import { usePreviewState } from './state'

export interface EditableTextNextFocus {
  /**
   * The field path of an editable field that can be focused next within the next 500 milliseconds.
   */
  path: string

  /**
   * The timestamp when the next focus was set.
   * This is used to determine if the next focus is still valid after 500 milliseconds.
   */
  timestamp: number

  /**
   * The selection to apply when focusing the next field.
   *
   * If a number is provided, it will be used as the cursor position.
   * If an object with `from` and `to` properties is provided, it will be used as the selection range.
   */
  selection?: { from: number; to: number } | number
}

export function focusEditableField(fieldPath: string, selection?: EditableTextNextFocus['selection']) {
  const { editableTextNextFocus } = usePreviewState()
  editableTextNextFocus.value = { path: fieldPath, timestamp: Date.now(), selection }
}

export function focusPrevEditableField(
  fieldPath: string,
  selection?: EditableTextNextFocus['selection'],
): string | null {
  const { editableTextNextFocus } = usePreviewState()
  const domEditableFields = getAllDOMEditableFields()
  const index = domEditableFields.findIndex(({ path }) => path === fieldPath)
  const prevDOMEditableField = domEditableFields[index - 1]

  if (prevDOMEditableField) {
    editableTextNextFocus.value = {
      path: prevDOMEditableField.path,
      timestamp: Date.now(),
      selection: selection ?? prevDOMEditableField.selection,
    }
    return prevDOMEditableField.path
  }

  return null
}

export function focusNextEditableField(
  fieldPath: string,
  selection?: EditableTextNextFocus['selection'],
): string | null {
  const { editableTextNextFocus } = usePreviewState()
  const domEditableFields = getAllDOMEditableFields()
  const index = domEditableFields.findIndex(({ path }) => path === fieldPath)
  const nextDOMEditableField = domEditableFields[index + 1]

  if (nextDOMEditableField) {
    editableTextNextFocus.value = {
      path: nextDOMEditableField.path,
      timestamp: Date.now(),
      selection: selection ?? nextDOMEditableField.selection,
    }
    return nextDOMEditableField.path
  }

  return null
}

export function focusNearestEditableField(
  fieldPath: string,
  selection?: EditableTextNextFocus['selection'],
): string | null {
  const { editableTextNextFocus } = usePreviewState()
  const domEditableFields = getAllDOMEditableFields()
  const index = domEditableFields.findIndex(({ path }) => path === fieldPath)
  const prevDOMEditableField = domEditableFields[index - 1]
  const nextDOMEditableField = domEditableFields[index + 1]
  const prevCommonChars = countCommonPrefix(fieldPath, prevDOMEditableField?.path ?? '')
  const nextCommonChars = countCommonPrefix(fieldPath, nextDOMEditableField?.path ?? '')

  if (prevDOMEditableField && prevCommonChars >= nextCommonChars) {
    editableTextNextFocus.value = {
      path: prevDOMEditableField.path,
      timestamp: Date.now(),
      selection: selection ?? prevDOMEditableField.selection,
    }
    return prevDOMEditableField.path
  } else if (nextDOMEditableField) {
    editableTextNextFocus.value = {
      path: nextDOMEditableField.path,
      timestamp: Date.now(),
      selection: selection ?? nextDOMEditableField.selection,
    }
    return nextDOMEditableField.path
  }

  return null
}

export function focusEditableFieldAfterMutation(fieldPath: string, selection?: EditableTextNextFocus['selection']) {
  const { editableTextNextFocus, mutationCallbacks } = usePreviewState()
  const now = Date.now()
  const callback = () => {
    if (Date.now() < now + 500) {
      editableTextNextFocus.value = { path: fieldPath, timestamp: Date.now(), selection }
    }
    return true
  }

  editableTextNextFocus.value = { path: fieldPath, timestamp: Date.now(), selection }

  for (let i = mutationCallbacks.value.length - 1; i >= 0; i--) {
    if ((mutationCallbacks.value[i] as any)._focusEditableFieldAfterMutation) {
      mutationCallbacks.value.splice(i, 1)
    }
  }

  callback._focusEditableFieldAfterMutation = true
  mutationCallbacks.value.push(callback)
}
