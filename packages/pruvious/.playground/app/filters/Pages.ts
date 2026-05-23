import { addFilter } from '#pruvious/app'
import { isString, slugify } from '@pruvious/utils'

/**
 * Auto-derive `subpath` from `seo.title` while creating a new `Pages` record.
 *
 * Defensive guards (in order):
 * - Routing must be enabled on the collection (otherwise no `subpath` field exists).
 * - The `seo` field must be enabled (otherwise the `seo.title` change path never fires).
 * - The new title must be a string.
 * - The current `subpath` must already be a string - if the toggle is off (`null`) we leave it.
 * - The current `subpath` must still match the slug derived from the previous title - the
 *   moment the user customizes it manually, this filter steps back and leaves it alone.
 */
addFilter('dashboard:collections:new:change', (data, { collection, changes }) => {
  if (collection.name !== 'Pages') {
    return data
  }

  if (!collection.definition.routing.enabled || !collection.definition.routing.seoField) {
    return data
  }

  const titleChange = changes.find((change) => change.path === 'seo.title')

  if (!titleChange || !isString(titleChange.newValue) || !isString(data.subpath)) {
    return data
  }

  const previousAuto = isString(titleChange.oldValue) ? slugify(titleChange.oldValue) : ''

  if (data.subpath !== '' && data.subpath !== previousAuto) {
    return data
  }

  return { ...data, subpath: slugify(titleChange.newValue) }
})
