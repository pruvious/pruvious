const pkgPrNewBase = 'https://pkg.pr.new/pruvious/pruvious/pruvious'

/**
 * BCP-47 subset accepted by Pruvious for language codes: a lowercase 2-3 letter
 * base, an optional Title-case script subtag, and an optional UPPERCASE region or
 * 3-digit M.49 code (e.g. `en`, `de-AT`, `zh-Hant`, `es-419`).
 */
export const languageCodePattern = /^[a-z]{2,3}(-[A-Z][a-z]{3})?(-([A-Z]{2}|\d{3}))?$/

/**
 * Turns the `--pruvious` argument into an installable dependency specifier.
 * Full URLs and `npm:`/`file:` specifiers pass through unchanged, a bare commit
 * hash installs the matching pkg.pr.new continuous build, and anything else is
 * treated as an npm dist-tag or version (e.g. `alpha`, `4.0.0-alpha.0`).
 *
 * A dist-tag is resolved to the concrete version it currently points to (see
 * `resolveDistTag`) so the scaffolded `package.json` pins an exact version
 * rather than a floating tag. Writing the tag verbatim would let the install
 * step re-resolve it against npm's local metadata cache, which can lag behind a
 * freshly published tag and quietly install a stale version.
 *
 * The commit-hash test requires at least one digit so that all-letter hex words
 * (e.g. a `deadbeef` dist-tag) are still treated as npm specifiers.
 */
export async function resolvePruviousSpec(version: string): Promise<string> {
  if (version.includes('://') || version.startsWith('npm:') || version.startsWith('file:')) {
    return version
  }

  if (/^(?=.*[0-9])[0-9a-f]{7,40}$/i.test(version)) {
    return `${pkgPrNewBase}@${version}`
  }

  return (await resolveDistTag('pruvious', version)) ?? version
}

/**
 * Resolves an npm dist-tag to the concrete version it points to by querying the
 * registry directly, bypassing npm's local metadata cache so a freshly
 * published tag is picked up immediately. A concrete version (or unknown tag)
 * is not listed under `dist-tags`, so the lookup misses and the caller falls
 * back to the original input. Network or registry errors resolve to `null` for
 * the same fallback, preserving the previous tag-passthrough behavior offline.
 */
export async function resolveDistTag(name: string, tag: string): Promise<string | null> {
  try {
    const response = await fetch(`https://registry.npmjs.org/${name}`, {
      headers: { accept: 'application/vnd.npm.install-v1+json' },
    })

    if (!response.ok) {
      return null
    }

    const packument = (await response.json()) as { 'dist-tags'?: Record<string, string> }

    return packument['dist-tags']?.[tag] ?? null
  } catch {
    return null
  }
}

/**
 * Derives a human-readable language name from a BCP-47 code in its native form
 * (e.g. `de` -> `Deutsch`), capitalizing the first letter. Falls back to the raw
 * code when the runtime cannot resolve a display name.
 */
export function languageName(code: string): string {
  try {
    const display = new Intl.DisplayNames([code], { type: 'language' }).of(code)

    if (display && display.toLowerCase() !== code.toLowerCase()) {
      return display.charAt(0).toUpperCase() + display.slice(1)
    }
  } catch {}

  return code
}
