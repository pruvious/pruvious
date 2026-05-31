import { __, assertUserPermissions, pruviousError, pruviousIconNames, type PruviousIconDir } from '#pruvious/server'
import { isEmpty, isString, sanitizeSvg } from '@pruvious/utils'
import fs from 'node:fs'
import { join } from 'pathe'
import { ICON_NAME_PATTERN, resolveIconDir } from '../../../../modules/pruvious/icons/utils.server'

/**
 * Serves a sanitized SVG icon for the dashboard picker.
 */
export default defineEventHandler(async (event) => {
  assertUserPermissions(event, ['access-dashboard'])

  const name = getRouterParam(event, 'name') ?? ''
  if (!ICON_NAME_PATTERN.test(name)) {
    throw pruviousError(event, {
      statusCode: 400,
      message: __('pruvious-api', 'Invalid icon name'),
    })
  }

  const query = getQuery(event)
  const resolved = resolveIconDir(isString(query.dir) ? query.dir : undefined)
  if (resolved.kind !== 'resolved') {
    throw pruviousError(event, {
      statusCode: 400,
      message: __('pruvious-api', 'Invalid icon directory'),
    })
  }

  const names: readonly string[] = pruviousIconNames[resolved.prefix as PruviousIconDir] ?? []
  if (!names.includes(name)) {
    throw pruviousError(event, {
      statusCode: 404,
      message: __('pruvious-api', 'Icon not found'),
    })
  }

  let raw: string | null = null
  for (const dir of resolved.abs) {
    try {
      raw = fs.readFileSync(join(dir, `${name}.svg`), 'utf-8')
      break
    } catch {
      continue
    }
  }

  if (raw === null) {
    throw pruviousError(event, {
      statusCode: 404,
      message: __('pruvious-api', 'Icon not found'),
    })
  }

  const { svg } = sanitizeSvg(raw)
  if (isEmpty(svg)) {
    throw pruviousError(event, {
      statusCode: 404,
      message: __('pruvious-api', 'Icon not found'),
    })
  }

  setResponseHeader(event, 'Content-Type', 'image/svg+xml; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', 'private, max-age=300')
  return svg
})
