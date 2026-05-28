# Job queue

Pruvious includes a built-in job queue for background work - image optimization, scheduled publishing, cleanup tasks, sending emails, and anything else you do not want to run inline with an HTTP request.

Jobs are TypeScript files in `server/jobs/`. They are typed end-to-end: the payload shape you declare in the handler is what `queueJob()` requires at the call site.

## Why a queue

Use the queue when work is:

- Slow (image transcoding, PDF generation, sending email, calling a third-party API).
- Periodic (clean up stale uploads, publish scheduled drafts, sync external data).
- Best-effort (retry on failure without blocking the user's response).

Pruvious ships with three queue jobs out of the box:

- `pruvious-optimize-image` - generates an image variant and writes it to storage.
- `pruvious-publish-scheduled-pages` - sweeps every routable collection on a 60-second interval and flips drafts whose `scheduledAt` has elapsed to public.
- `pruvious-clean-multipart-uploads` - aborts unfinished multipart uploads older than 24 hours.

## Defining a job

Create a file in `server/jobs/`. The filename (kebab-case) becomes the job name.

```ts
// server/jobs/send-welcome-email.ts
import { defineJob } from '#pruvious/server'

interface Payload {
  to: string
  name: string
}

export default defineJob({
  handler: async (payload: Payload) => {
    await sendMail({
      to: payload.to,
      subject: `Welcome, ${payload.name}!`,
      body: '...',
    })
    return { delivered: true }
  },
  defaultPriority: 20,
  retry: { count: 3, delay: 5000 },
  logs: true,
})
```

The full set of options:

```ts
interface DefineJobOptions<TPayload, TResultData> {
  handler: (payload: TPayload) => TResultData | Promise<TResultData>

  // Default priority. Higher runs sooner. @default 10
  defaultPriority?: number

  // Recurring execution. Re-queued automatically after every run.
  schedule?: false | {
    interval: number | string | false // '5 minutes', '1h', '24h', seconds
    immediate?: boolean               // run on server startup, @default true
    payload?: () => TPayload          // required if your handler takes a payload
  }

  // Retry behavior for failed jobs. Each retry is a new queue entry.
  // Pass a number for the retry count (5s delay between), an object,
  // or false to disable. @default false
  retry?: false | number | { count: number; delay?: number }

  // Whether successful and failed runs are written to the logs DB.
  // Only takes effect when `pruvious.debug.logs.queue` is enabled.
  // @default true
  logs?: boolean | { exposePayload?: boolean }
}
```

If you only need a handler, the shorter `defineJobHandler()` exists:

```ts
// server/jobs/rebuild-search-index.ts
import { defineJobHandler } from '#pruvious/server'

export default defineJobHandler(async () => {
  // ...
})
```

### Scheduled jobs

Add a `schedule` to make a job recur. Pruvious re-enqueues it after each run.

```ts
// server/jobs/refresh-stats.ts
import { defineJob } from '#pruvious/server'

export default defineJob({
  schedule: { interval: '15m' },
  retry: false,
  handler: async () => {
    // ...
  },
})
```

If the handler takes a payload, provide a `payload` function on `schedule` that returns it at enqueue time.

## Enqueueing a job

Call `queueJob()` (or `queueUniqueJob()`) from anywhere on the server. The payload is typed against the job name.

```ts
import { queueJob } from '#pruvious/server'

await queueJob('send-welcome-email', {
  to: 'hello@pruvious.com',
  name: 'Pat',
})
```

Optional fields:

```ts
await queueJob('send-welcome-email', {
  to: 'hello@pruvious.com',
  name: 'Pat',
  priority: 100,             // override defaultPriority
  scheduledAt: Date.now() + 60_000, // run at least 1 minute from now
})
```

To prevent duplicates, use `queueUniqueJob()` with a unique key. New enqueues with the same key are rejected while an entry exists.

```ts
import { queueUniqueJob } from '#pruvious/server'

await queueUniqueJob('pruvious-optimize-image', `thumbnail:${uploadId}`, {
  uploadIdOrPath: uploadId,
  options: { format: 'webp', originalExtension: '.jpg', width: 320, height: 320 },
})
```

## Job lifecycle

1. `queueJob()` inserts a row into the `Queue` table with `name`, `payload`, `priority`, `scheduledAt`, and `key`.
2. A worker picks the highest-priority job whose `scheduledAt` is null or in the past.
3. The row is deleted, the handler runs, and the result (or error) is captured.
4. On success, the job is done. On failure, if `retry` is configured, a new row is enqueued with `attempt = previous + 1` and `scheduledAt = now + delay`.
5. If `pruvious.debug.logs.queue` is enabled, the run is written to the logs database. The dashboard's logs view shows status, attempt, payload, and result.

Priority ties break on insertion order (oldest first).

## Processing modes

The queue runs in one of two modes, controlled by `pruvious.queue.mode`:

```ts
pruvious: {
  queue: {
    driver: 'mainDatabase',
    mode: 'auto', // 'auto' | 'manual'
    secret: '...', // bearer token for /api/process-queue
  },
}
```

### Auto mode (default)

After every HTTP request, the middleware fires a non-blocking `POST /api/process-queue` via `event.waitUntil()`. That handler processes the next job, then triggers itself again until the queue is empty.

This means jobs run on the same server that handles requests, with no extra infrastructure. The `/api/process-queue` endpoint is excluded from the regular API middleware and from request logging.

### Manual mode

Set `mode: 'manual'` if you prefer to drive the queue from outside - typically a cron job or a separate worker. Nothing runs after HTTP requests.

```bash
curl -X POST https://example.com/api/process-queue \
  -H "Authorization: Bearer $QUEUE_SECRET"
```

Each POST processes one job. In manual mode the handler does not chain itself - schedule the endpoint repeatedly (cron, scheduler, or your own batch script) to drain the queue.

## Driver

The queue lives in the main database by default. Point it elsewhere with a connection string:

```ts
pruvious: {
  queue: {
    driver: 'sqlite://queue.sqlite',
    // 'mainDatabase'
    // 'sqlite://path/to/queue.sqlite'
    // 'postgres://user:pass@host:5432/db?ssl=true'
    // 'd1://QUEUE'  (D1 binding)
  },
}
```

A `Queue` table is created on first run.

## Securing the endpoint

`/api/process-queue` requires the configured secret as a bearer token. In production set it explicitly:

```ts
pruvious: {
  queue: {
    secret: process.env.NUXT_PRUVIOUS_QUEUE_SECRET,
  },
}
```

If you omit it, a random key is generated at startup. That works for development but means every restart invalidates any external cron.

## Programmatic API

For inspection, manual triggering, or admin tooling, `#pruvious/server` exposes:

```ts
import {
  getQueue,        // list scheduled jobs (optionally filtered by name)
  getJob,          // fetch one job by ID
  processQueue,    // process every ready job sequentially
  processNextJob,  // process the next ready job (optionally filtered)
  processJob,      // process a specific job by ID (force = ignore schedule)
  clearQueue,      // delete jobs (optionally filtered by name)
  deleteJob,       // delete one job by ID
  triggerQueueProcessing, // POST to /api/process-queue
} from '#pruvious/server'

const pending = await getQueue() // QueuedJob[]
const result = await processNextJob('send-welcome-email')
```
