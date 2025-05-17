/**
 * Returns a script that removes unwanted stylesheets from the Pruvious dashboard interface.
 *
 * You can specify which stylesheets to preserve by configuring the `pruvious.dashboard.filterStylesheets` option in your `nuxt.config.ts` file.
 */
export function getCleanupDashboardStylesheetsScript(filterStylesheets: string[], dashboardBasePath: string) {
  const filterStylesheetsStringified = JSON.stringify(filterStylesheets)

  return `function disableUnwantedStylesInDashboard() {
  Array.from(document.styleSheets).forEach(checkAndDisableStylesheet)

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        Array.from(document.styleSheets).forEach(checkAndDisableStylesheet)
      }
    })
  })

  observer.observe(document.head, { childList: true, subtree: true })

  function checkAndDisableStylesheet(stylesheet) {
    try {
      if (!stylesheet.disabled && window.location.pathname.startsWith('${dashboardBasePath}')) {
        const rules = Array.from(stylesheet.cssRules || stylesheet.rules)
        const keep =
          rules.every((rule) => !rule.selectorText) ||
          rules.some(
            (rule) =>
              rule.selectorText &&
              ${filterStylesheetsStringified}.some((str) => rule.selectorText.includes(str) || rule.cssText.includes(str))
          )

        if (!keep) {
          stylesheet.disabled = true
        }
      }
    } catch (e) {
      console.error('Error disabling stylesheet:', e)
    }
  }
}

disableUnwantedStylesInDashboard()`
}
