import { useState, type Ref } from '#imports'
import type { AuthUser } from '#pruvious'

/**
 * The current logged in user.
 */
export const useUser: () => Ref<AuthUser | null> = () => useState('pruvious-user', () => null)
