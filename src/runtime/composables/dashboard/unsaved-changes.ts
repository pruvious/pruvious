import { useState, type Ref } from '#imports'
import type { History } from '../../utils/dashboard/history'

export const useUnsavedChanges: () => Ref<History | null> = () => useState('pruvious-unsaved-changes', () => null)

export function watchUnsavedChanges(history: History) {
  useUnsavedChanges().value = history
}
