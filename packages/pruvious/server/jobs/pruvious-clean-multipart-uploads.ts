import { abortMultipartUpload, defineJob, selectFrom } from '#pruvious/server'
import { isEmpty, isString } from '@pruvious/utils'

const STALE_AFTER_MS = 24 * 60 * 60 * 1000
const BATCH_LIMIT = 500

/**
 * Sweeps unfinished multipart uploads older than 24 hours and aborts them.
 *
 * `createMultipartUpload()` marks the `Uploads` row with `isLocked: true` and stores the
 * provider key on `multipart`. If the client never calls `completeMultipartUpload()` or
 * `abortMultipartUpload()` (browser closed mid-upload, network drop, etc.) the row stays
 * locked and the storage provider keeps the orphaned parts. Going through
 * `abortMultipartUpload()` ensures both the storage parts and the `Uploads` row are
 * removed in the same flow as a user-triggered abort.
 *
 * Capped at `BATCH_LIMIT` rows per tick so a flood of stale uploads cannot starve the
 * queue worker - any remainder is picked up on the next daily run.
 */
export default defineJob({
  schedule: { interval: '24h' },
  retry: false,
  handler: async () => {
    const cutoff = Date.now() - STALE_AFTER_MS

    const stale = await selectFrom('Uploads')
      .select(['multipart'])
      .where('isLocked', '=', true)
      .where('multipart', '!=', null)
      .where('createdAt', '<', cutoff)
      .limit(BATCH_LIMIT)
      .all()

    let aborted = 0
    let skipped = 0
    const errors: string[] = []

    if (!stale.success || isEmpty(stale.data)) {
      return { aborted, errors, skipped }
    }

    for (const row of stale.data) {
      const key = row.multipart?.key

      if (!isString(key)) {
        skipped++
        continue
      }

      const result = await abortMultipartUpload(key, { guarded: false })

      if (result.success) {
        aborted++
      } else {
        errors.push(result.error)
      }
    }

    return { aborted, errors, skipped }
  },
})
