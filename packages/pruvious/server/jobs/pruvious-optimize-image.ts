import { createOptimizedImage, defineJob, selectFrom, type ImageTransformOptions } from '#pruvious/server'
import { isString } from '@pruvious/utils'

export default defineJob({
  retry: { count: 5, delay: 1000 },
  handler: async ({
    uploadIdOrPath,
    options,
    baseURL,
  }: {
    uploadIdOrPath: number | string
    options: ImageTransformOptions
    baseURL?: string
  }) => {
    const checkQuery = selectFrom('Uploads').select('category').withCustomContextData({ _allowUploadsQueries: true })

    if (isString(uploadIdOrPath)) {
      checkQuery.where('path', '=', uploadIdOrPath)
    } else {
      checkQuery.where('id', '=', uploadIdOrPath)
    }

    const checkResult = await checkQuery.first()

    if (!checkResult.success) {
      throw new Error(checkResult.runtimeError || 'Database query failed')
    } else if (!checkResult.data) {
      throw new Error('Upload not found')
    } else if (checkResult.data.category !== 'image') {
      throw new Error('Upload is not an image')
    }

    const result = await createOptimizedImage(uploadIdOrPath, options, baseURL)

    if (!result.success) {
      throw new Error(result.error)
    }

    return result
  },
})
