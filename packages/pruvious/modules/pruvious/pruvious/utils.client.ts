import { pruviousGet } from '../api/utils.client'
import type { SerializableCollection } from '../collections/utils.client'
import type { SerializableSingleton } from '../singletons/utils.client'
import { deserializeTranslatableStringCallbacks } from '../translations/utils.client'

export interface PruviousState {
  /**
   * Indicates whether the Pruvious CMS is installed.
   */
  installed: boolean

  /**
   * The current version of the Pruvious CMS.
   */
  version: string
}

export interface PruviousDashboardState {
  /**
   * Contains the collections available to the current user.
   * The key is the collection name, and the value is the `SerializableCollection` definition.
   */
  collections: Record<string, SerializableCollection>

  /**
   * Contains the singletons available to the current user.
   * The key is the singleton name, and the value is the `SerializableSingleton` definition.
   */
  singletons: Record<string, SerializableSingleton>

  /**
   * Indicates which log types are available for the current user.
   * Is `null` if logs are disabled or the user does not have the required permissions.
   */
  logs: {
    /**
     * Indicates whether the current user can access API request/response logs.
     */
    api: boolean

    /**
     * Indicates whether the current user can access database query execution logs.
     */
    queries: boolean

    /**
     * Indicates whether the current user can access background job processing logs.
     */
    queue: boolean

    /**
     * Indicates whether the current user can access custom logs.
     */
    custom: boolean
  } | null
}

/**
 * Composable that provides access to the current state of the Pruvious CMS.
 * It is automatically resolved through the `pruvious-dashboard` middleware.
 */
export const usePruvious = () => useState<PruviousState | null>('pruvious-state', () => null)

/**
 * Composable that manages the Pruvious dashboard state and data.
 * Contains dashboard data based on user authentication status and role permissions.
 */
export const usePruviousDashboard = () =>
  useState<PruviousDashboardState | null>('pruvious-dashboard-state', () => null)

let unwantedStylesRemoved = false

/**
 * Retrieves the current state of the Pruvious CMS from `/<pruvious.api.basePath>/pruvious`.
 * The HTTP request runs only if the state is not already present.
 * Set `force` to true to make the request run on every function call.
 *
 * This function automatically updates the `usePruvious` composable and returns the new state.
 */
export async function refreshPruviousState(force = false) {
  const pruvious = usePruvious()

  if (!pruvious.value || force) {
    const { success, data, error } = await pruviousGet('pruvious')

    if (success) {
      pruvious.value = data
    } else {
      console.error(error)
    }
  }

  return pruvious.value
}

/**
 * Retrieves the Pruvious dashboard state from `/<pruvious.api.basePath>/dashboard` for the current user.
 * The HTTP request runs only if the state is not already present.
 * Set `force` to true to make the request run on every function call.
 *
 * This function automatically updates the `usePruviousDashboard` composable and returns the new state.
 */
export async function refreshPruviousDashboardState(force = false) {
  const dashboard = usePruviousDashboard()

  if (!dashboard.value || force) {
    const { success, data, error } = await pruviousGet('pruvious/dashboard')

    if (success) {
      for (const collection of Object.values(data.collections)) {
        for (const options of Object.values(collection.fields)) {
          Object.assign(options, deserializeTranslatableStringCallbacks(options))
        }
        Object.assign(collection.ui, deserializeTranslatableStringCallbacks(collection.ui as any))
      }

      for (const singleton of Object.values(data.singletons)) {
        for (const options of Object.values(singleton.fields)) {
          Object.assign(options, deserializeTranslatableStringCallbacks(options))
        }
        Object.assign(singleton.ui, deserializeTranslatableStringCallbacks(singleton.ui as any))
      }

      dashboard.value = data
    } else {
      console.error(error)
    }
  }

  return dashboard.value
}

/**
 * Removes unwanted styles from the dashboard.
 * This function is automatically called by the `pruvious-dashboard` middleware.
 */
export function removeUnwantedStylesFromDashboard() {
  if (!unwantedStylesRemoved) {
    for (const styleSheet of document.styleSheets) {
      let keep = false

      for (const rule of styleSheet.cssRules) {
        if (
          rule instanceof CSSStyleRule &&
          (rule.selectorText.includes('.p-') ||
            rule.selectorText.includes('.pui-') ||
            rule.selectorText.includes('[data-sonner-toaster]') ||
            rule.selectorText.includes('.vue-inspector-'))
        ) {
          keep = true
          break
        }
      }

      if (!keep) {
        styleSheet.disabled = true
      }
    }

    unwantedStylesRemoved = true
  }
}
