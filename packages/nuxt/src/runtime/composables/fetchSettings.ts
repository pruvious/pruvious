import { _pruviousRequest, Pruvious } from '#imports'

interface Options {
  /**
   * Time in milliseconds to cache the settings on the client.
   *
   * Set to `'max'` to keep the response value until the page is reloaded in
   * the browser.
   *
   * Set to `0` to disable caching.
   *
   * Defaults to `'max'`.
   */
  clientCache?: number | 'max'

  /**
   * Time in milliseconds to cache the settings on the client.
   *
   * Set to `'max'` to keep the response value until server restart.
   *
   * Set to `0` to disable caching.
   *
   * Defaults to `1000`.
   */
  serverCache?: number | 'max'
}

/**
 * Fetch settings from the Pruvious API by a specified `group`. By default, the
 * response is cached for 1 second on the server and indefinitely on the
 * client.
 *
 * To retrieve settings for a specific language, set the `language` parameter
 * to an existing language code (e.g. `'en'`, `'de'`, etc.).
 *
 * @example
 * ```js
 * await fetchSettings('general') // Get the `general` settings
 * await fetchSettings('strings', 'de') // Get the `strings` settings in German
 * ```
 */
export async function fetchSettings<SettingsGroup extends keyof Pruvious.Settings>(
  group: SettingsGroup,
  language?: Pruvious.Settings[SettingsGroup]['languages'],
  options: Options = {},
): Promise<Pruvious.Settings[SettingsGroup]['fields']> {
  return await _pruviousRequest(
    language
      ? `/settings/${group.toString()}?language=${language}`
      : `/settings/${group.toString()}`,
    {
      clientCache: options.clientCache ?? 'max',
      serverCache: options.serverCache ?? 1000,
    },
  )
}
