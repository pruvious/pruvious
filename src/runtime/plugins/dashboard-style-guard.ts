import { addRouteMiddleware, defineNuxtPlugin, useRuntimeConfig } from '#imports'

export default defineNuxtPlugin(() => {
  const dashboardPrefix = useRuntimeConfig().public.pruvious.dashboardPrefix
  if (!dashboardPrefix) return

  let installed = false

  const pruviousPathRe = /[\/\\]pruvious(?:-[\w.]+)?[\/\\](?:dist|src)[\/\\]runtime[\/\\]/

  function isPruviousStyleNode(node: HTMLElement): boolean {
    const devId = (node as HTMLStyleElement).dataset?.viteDevId
    if (devId && pruviousPathRe.test(devId)) return true
    if (node.tagName === 'LINK') {
      const href = node.getAttribute('href') || ''
      if (pruviousPathRe.test(href)) return true
    }
    if (node.dataset.pruvious === 'true') return true
    return false
  }

  function apply() {
    const path = window.location.pathname
    const onDashboard = path === '/' + dashboardPrefix || path.startsWith('/' + dashboardPrefix + '/')
    if (!onDashboard) return
    for (const node of Array.from(document.querySelectorAll<HTMLElement>('link[rel~="stylesheet"], style'))) {
      if (!isPruviousStyleNode(node)) node.remove()
    }
  }

  function install() {
    if (installed) return
    installed = true
    apply()
    new MutationObserver(apply).observe(document.head, { childList: true, subtree: true })
  }

  addRouteMiddleware(
    'pruvious-dashboard-style-guard',
    (to) => {
      const onDashboard = to.path === '/' + dashboardPrefix || to.path.startsWith('/' + dashboardPrefix + '/')
      if (!onDashboard) return
      install()
      apply()
    },
    { global: true },
  )
})
