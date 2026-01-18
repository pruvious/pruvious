import { dashboardBasePath, dashboardMiddleware } from '#pruvious/dashboard'
import type { Permission } from '#pruvious/server'
import { castToNumber, isDefined, isPositiveInteger, isString } from '@pruvious/utils'
import type { RouteLocationNormalizedGeneric } from 'vue-router'

export default function (to: RouteLocationNormalizedGeneric) {
  return dashboardMiddleware(to, ({ __, getCollectionBySlug, isValidLanguageCode, hasPermission, puiQueueToast }) => {
    const collection = getCollectionBySlug(to.params.collection)
    const translationOf = isString(to.query.translationOf) ? castToNumber(to.query.translationOf) : undefined
    const language = to.query.language

    if (!collection || !collection.definition.api.create || collection.definition.ui.hidden) {
      puiQueueToast(__('pruvious-dashboard', 'Redirected'), {
        type: 'error',
        description: __('pruvious-dashboard', 'Page not found'),
        showAfterRouteChange: true,
      })
      return navigateTo(dashboardBasePath + 'overview')
    } else if (!hasPermission(`collection:${to.params.collection}:create` as Permission)) {
      puiQueueToast(__('pruvious-dashboard', 'Redirected'), {
        type: 'error',
        description: __('pruvious-dashboard', 'You do not have permission to access the page `$page`', {
          page: to.path,
        }),
        showAfterRouteChange: true,
      })
      return navigateTo(dashboardBasePath + `collections/${to.params.collection}`)
    } else if (collection.definition.translatable && isDefined(translationOf) && !isPositiveInteger(translationOf)) {
      puiQueueToast(__('pruvious-dashboard', 'Redirected'), {
        type: 'error',
        description: __('pruvious-dashboard', 'Invalid `$param` parameter', { param: 'translationOf' }),
        showAfterRouteChange: true,
      })
      return navigateTo(dashboardBasePath + `collections/${to.params.collection}`)
    } else if (collection.definition.translatable && isDefined(language) && !isValidLanguageCode(language)) {
      puiQueueToast(__('pruvious-dashboard', 'Redirected'), {
        type: 'error',
        description: __('pruvious-dashboard', 'Invalid `$param` parameter', { param: 'language' }),
        showAfterRouteChange: true,
      })
      return navigateTo(dashboardBasePath + `collections/${to.params.collection}`)
    }
  })
}
