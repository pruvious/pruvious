import { addFilter } from '#pruvious/app'
import { isNull, isString, slugify } from '@pruvious/utils'

/**
 * Auto-derive `subpath` from `name` while creating a new `Articles` record.
 *
 * Only kicks in when the subpath toggle is on and the current value is either empty or still
 * matches the previous auto-derivation - the moment the user customizes the subpath manually,
 * this filter leaves it alone.
 */
addFilter('dashboard:collections:new:change', (data, { collection, changes }) => {
  if (collection.name !== 'Articles') {
    return data
  }

  const nameChange = changes.find((change) => change.path === 'name')

  if (!nameChange || isNull(data.subpath)) {
    return data
  }

  const previousAuto = isString(nameChange.oldValue) ? slugify(nameChange.oldValue) : ''

  if (data.subpath === '' || data.subpath === previousAuto) {
    return { ...data, subpath: slugify(isString(nameChange.newValue) ? nameChange.newValue : '') }
  }

  return data
})
