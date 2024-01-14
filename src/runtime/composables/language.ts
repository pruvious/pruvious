import { useNuxtApp, useRuntimeConfig, useState, type Ref } from '#imports'
import type { SupportedLanguage } from '#pruvious'
import { loadTranslatableStrings, useTranslatableStrings } from './translatable-strings'

/**
 * Code representing the currently active language in the app.
 */
export const useLanguage: () => Ref<SupportedLanguage | null> = () => useState('pruvious-language', () => null)

/**
 * Retrieve the currently active language code for the Nuxt app.
 */
export function getLanguage(): SupportedLanguage {
  const language = useLanguage()
  const runtimeConfig = useRuntimeConfig()

  if (!language.value) {
    language.value = resolveLanguage()
  }

  if (process.client && localStorage.getItem(runtimeConfig.public.pruvious.language.localStorageKey)) {
    localStorage.setItem(runtimeConfig.public.pruvious.language.localStorageKey, language.value!)
  }

  return language.value!
}

/**
 * Set the active language code for the Nuxt app.
 *
 * @returns A promise resolving to `true` on success, `false` otherwise.
 */
export async function setLanguage(
  languageCode: SupportedLanguage,
  options?: {
    /**
     * Controls whether translatable strings are reloaded upon language change.
     * This fetches missing strings for each domain in use, which can also be done manually with `loadTranslatableStrings()`.
     *
     * @default true
     */
    reloadTranslatableStrings?: boolean
  },
): Promise<boolean> {
  const runtimeConfig = useRuntimeConfig()
  const { supported } = runtimeConfig.public.pruvious.language

  if (supported.some(({ code }: any) => code === languageCode)) {
    if (options?.reloadTranslatableStrings !== false) {
      const ts = useTranslatableStrings().value
      await loadTranslatableStrings(Object.keys(ts) as any, languageCode)
    }

    const language = useLanguage()
    language.value = languageCode

    if (process.server) {
      const nuxtApp = useNuxtApp()
      nuxtApp.ssrContext!.event.context.language = language.value
    } else {
      localStorage.setItem(runtimeConfig.public.pruvious.language.localStorageKey, language.value)
    }

    return true
  }

  return false
}

/**
 * Retrieve the preferred language code for the Nuxt app.
 *
 * Server side:
 * - Begins with checking the `Accept-Language` header.
 * - Falls back to the primary language if not resolved.
 *
 * On client side:
 * - Starts by checking the stored language option in local storage.
 * - If absent, attempts to determine it from `navigator.language`.
 * - Falls back to the primary language if no match with supported CMS languages.
 */
export function resolveLanguage(): SupportedLanguage {
  const nuxtApp = useNuxtApp()
  const runtimeConfig = useRuntimeConfig()
  const options = runtimeConfig.public.pruvious.language
  const primaryLanguage = options.primary as SupportedLanguage

  if (process.server) {
    return nuxtApp.ssrContext!.event.context.language || runtimeConfig.public.pruvious.language.primary
  } else {
    const language = localStorage.getItem(options.localStorageKey) || navigator.language

    if (options.supported.some(({ code }: any) => code === language)) {
      return language as SupportedLanguage
    } else if (language.includes('-')) {
      const shortCode = language.split('-').shift()!

      if (options.supported.some(({ code }: any) => code === shortCode)) {
        return shortCode as SupportedLanguage
      }
    }
  }

  return primaryLanguage
}
