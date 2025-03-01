import type { Jobs } from '#pruvious/server'
import {
  Collection,
  createdAtField,
  Field,
  numberFieldModel,
  objectFieldModel,
  textFieldModel,
  uniqueValidator,
} from '@pruvious/orm'
import { privateCollectionMeta } from '../collections/meta'

export interface QueuedJob<TJobName extends keyof Jobs> {
  /**
   * The name of the job.
   * It must match the filename of the job handler located in the `server/jobs/` directory, without the file extension.
   */
  name: TJobName

  /**
   * The payload data passed to the job handler when it is processed.
   */
  payload: Jobs[TJobName]['TPayload']

  /**
   * A numeric value that defines how important this job is compared to others.
   * Higher numbers mean the job will run sooner than jobs with lower numbers.
   * If two jobs have equal priority, they run in the order they were added to the queue.
   */
  priority: number

  /**
   * Represents a unique identifier for the job.
   *
   * - Used when calling `queueUniqueJob` function.
   * - Prevents duplicate jobs by rejecting any new job with an existing key.
   * - Is `null` for non-unique jobs that can have multiple instances.
   */
  key: string | null

  /**
   * The timestamp when this job is planned to run.
   * It is `null` if the job is not scheduled.
   */
  scheduledAt: number | null

  /**
   * The timestamp when this job was added to the queue.
   */
  createdAt: number
}

export const queueCollection = new Collection({
  fields: {
    name: new Field({
      model: textFieldModel(),
      required: true,
      nullable: false,
      options: {},
    }),
    payload: new Field({
      model: objectFieldModel(),
      default: null,
      options: {},
    }),
    priority: new Field({
      model: numberFieldModel(),
      required: true,
      nullable: false,
      options: {},
    }),
    key: new Field({
      model: textFieldModel(),
      default: null,
      options: {},
      validators: [uniqueValidator()],
    }),
    attempt: new Field({
      model: numberFieldModel(),
      default: 1,
      nullable: false,
      options: {},
    }),
    scheduledAt: new Field({
      model: numberFieldModel(),
      default: null,
      options: {},
    }),
    debugId: new Field({
      model: textFieldModel(),
      nullable: false,
      options: {},
    }),
    createdAt: createdAtField(),
  },
  indexes: [{ fields: ['key'], unique: true }],
  meta: privateCollectionMeta,
})
