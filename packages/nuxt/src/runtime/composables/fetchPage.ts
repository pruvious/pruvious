import { Pruvious, _pruviousRequest, useRoute } from '#imports'

interface Options {
  /**
   * Time in milliseconds to cache the page on the client.
   *
   * Set to `'max'` to keep the response value until the page is reloaded in
   * the browser.
   *
   * Set to `0` to disable caching.
   *
   * Defaults to `1000`.
   */
  clientCache?: number | 'max'

  /**
   * Time in milliseconds to cache the page on the client.
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
 * Fetch a page from the Pruvious API by a specified `path`. By default, the
 * response is cached for 1 second on both client and server.
 *
 * Use an empty string or `/` to fetch the homepage.
 *
 * Set `path` to `null` to fetch the page with the current route path.
 *
 * @example
 * ```js
 * await fetchPage('/contact') // Get the `/contact` page
 * ```
 */
export async function fetchPage(
  path: string | null = null,
  options: Options = {},
): Promise<Pruvious.Page | null> {
  if (path === null) {
    path = useRoute().fullPath
  }

  return await _pruviousRequest(`/path/${path.replace(/^\/*/, '')}`.replace(/\/*$/, ''), {
    clientCache: options.clientCache ?? 1000,
    serverCache: options.serverCache ?? 1000,
  })
}
