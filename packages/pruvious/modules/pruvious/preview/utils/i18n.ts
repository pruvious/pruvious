import { i18n } from '#pruvious/app/i18n'
import type { TranslatableStringCallbackContext } from '#pruvious/server'
import { isFunction } from '@pruvious/utils'
import { usePreviewState } from './state'

export function maybeTranslate<T extends string | ((context: TranslatableStringCallbackContext) => string) | undefined>(
  value: T,
): T extends undefined ? string | undefined : string {
  const t = i18n()
  const { dashboardLanguage } = usePreviewState()

  return isFunction(value)
    ? value({
        _: (handle: any, input: any) => t._$(dashboardLanguage.value, handle, input),
        __: (domain: any, handle: any, input: any) => t.__$(domain, dashboardLanguage.value, handle, input),
      })
    : (value as any)
}
