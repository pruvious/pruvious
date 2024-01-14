import { getModuleOption, getOptimizedImage, query } from '#pruvious/server'
import { defineEventHandler, getQuery } from 'h3'
import { resolve } from 'path'

export default defineEventHandler(async (event) => {
  const options = getModuleOption('uploads')
  const upload = await query('uploads').whereLike('filename', '%.jpg').first()
  const qs = Object.fromEntries(
    Object.entries(getQuery(event)).map(([key, value]) => [key, (+value).toString() === value ? +value : value]),
  )
  const result = await getOptimizedImage(upload!, qs as any, event.context.language)

  if (!result.success) {
    return { result }
  }

  const file =
    options.drive.type === 'local'
      ? resolve(process.cwd(), 'test/fixtures/basic/.uploads', result.src.replace('/uploads/', ''))
      : await $fetch(result.src, { responseType: 'arrayBuffer' })

  const sharp = ((await import('sharp')) as any).default
  const metadata = await sharp(file).metadata()

  return {
    result,
    format: metadata.format,
    width: metadata.width,
    height: metadata.height,
  }
})
