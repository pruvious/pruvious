import { useState, type Ref } from '#imports'
import { primaryLanguage, type SupportedLanguage } from '#pruvious'

/**
 * The current language for displaying collection records.
 */
export const useCollectionLanguage: () => Ref<SupportedLanguage> = () =>
  useState('pruvious-collection-language', () => primaryLanguage)
