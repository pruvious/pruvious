import { clearObject } from '../utils/object'

export interface Redirect {
  code: number
  to: string
  forwardQueryParams: boolean
}

export const redirects: Record<string, Redirect | null> = {}

export function clearRedirects() {
  clearObject(redirects)
}
