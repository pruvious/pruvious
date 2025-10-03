import { addFilter, getUser } from '#pruvious/client'
import { decodeQueryString, selectQueryBuilderParamsToQueryString } from '@pruvious/orm/query-string'
import { isEmpty } from '@pruvious/utils'

/**
 * Applies bookmark to `media` dashboard menu item.
 */
addFilter('dashboard:menu:general', (items) => {
  return items.map((item) => {
    if (item.to === 'media') {
      const _bookmark = getUser()?.bookmarks.find(({ collection }) => collection === 'Uploads')
      const bookmark = _bookmark ? { ..._bookmark, data: JSON.parse(_bookmark.data) } : undefined
      const queryParams: string[] = isEmpty(bookmark?.data?.columns) ? [] : []

      if (bookmark?.data) {
        queryParams.push(
          ...selectQueryBuilderParamsToQueryString(bookmark.data)
            .split('&')
            .filter(Boolean)
            .map((param) => {
              const parts = param.split('=')
              return [parts.shift()!, decodeQueryString(parts.join('='))].map(decodeQueryString).join('=')
            }),
        )
      }

      return { ...item, to: 'media' + (isEmpty(queryParams) ? '' : `?${queryParams.join('&')}`) }
    } else {
      return item
    }
  })
})
