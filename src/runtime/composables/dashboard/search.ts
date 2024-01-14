import { useState, type Ref } from '#imports'

/**
 * The current Pruvious search keywords.
 */
export const usePruviousSearch: () => Ref<Record<'media', string>> = () =>
  useState('pruvious-search', () => ({ media: '' }))
