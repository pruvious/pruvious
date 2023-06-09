import { defineNuxtPlugin, navigateTo } from '#imports'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('prose', (el) => {
    el.querySelectorAll('a').forEach((a: HTMLAnchorElement) => {
      if (a.getAttribute('href')?.startsWith('/') && (a.target === '_self' || !a.target)) {
        a.addEventListener('click', (event) => {
          if (!event.defaultPrevented) {
            event.preventDefault()
            navigateTo(a.getAttribute('href'))
          }
        })
      }
    })
  })
})
