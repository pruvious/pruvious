import { query } from '../../collections/query'
import { clearRedirects, redirects, type Redirect } from '../../instances/redirects'

export async function resolveRedirect(path: string): Promise<Redirect | null> {
  if (redirects[path]) {
    return redirects[path]
  }

  if (Object.keys(redirects).length > 100000) {
    clearRedirects()
  }

  const rules = (await query('redirects').read()).rules

  for (const rule of rules) {
    if (rule.isRegExp) {
      try {
        const match = path.match(new RegExp(rule.fromRegExp))

        if (match) {
          redirects[path] = {
            code: rule.code ? +rule.code : 302,
            to: rule.toRegExp.replace(/\$([1-9][0-9]*)/g, (_, i) => match[+i] ?? ''),
            forwardQueryParams: rule.forwardQueryParams,
          }

          return redirects[path]
        }
      } catch {}
    } else if (rule.from === path) {
      redirects[path] = {
        code: rule.code ? +rule.code : 302,
        to: rule.to,
        forwardQueryParams: rule.forwardQueryParams,
      }

      return redirects[path]
    }
  }

  redirects[path] = null

  return null
}
