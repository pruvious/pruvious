import Env from '@ioc:Adonis/Core/Env'
import path from 'path'

export function getCmsBaseUrl(trailingSlash: boolean = true) {
  return Env.get('CMS_BASE_URL').replace(/\/+$/, '') + (trailingSlash ? '/' : '')
}

export function getSiteBaseUrl(trailingSlash: boolean = true) {
  return Env.get('SITE_BASE_URL').replace(/\/+$/, '') + (trailingSlash ? '/' : '')
}

export function getBaseUploadsUrl(trailingSlash: boolean = true) {
  return getCmsBaseUrl(true) + 'uploads' + (trailingSlash ? '/' : '')
}

export function pruvDir() {
  return process.env.PRUVIOUS_OUTPUT_DIR
    ? path.resolve(process.env.PRUVIOUS_OUTPUT_DIR, '..')
    : process.cwd()
}
