import { _pruviousRequest, Pruvious, Ref } from '#imports'

interface Options {
  /**
   * Time in milliseconds to cache the languages on the client.
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
   * Time in milliseconds to cache the languages on the client.
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
 * Get the language list and default language from the Pruvious API. By default,
 * the response is cached for 1 second on the server and indefinitely on the
 * client.
 *
 * @example
 * ```js
 * await fetchLanguages()
 * // { languages: [{ code: 'en', label: 'English' }, { code: 'de', label: 'Deutsch' }], defaultLanguage: 'en' }
 * ```
 */
export async function fetchLanguages(options: Options = {}): Promise<Ref<{
  languages: Pruvious.Languages
  defaultLanguage: Pruvious.DefaultLanguage
}> | null> {
  return await _pruviousRequest('/languages', {
    clientCache: options.clientCache ?? 'max',
    serverCache: options.serverCache ?? 1000,
  })
}
