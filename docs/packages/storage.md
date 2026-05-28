# `@pruvious/storage`

`@pruvious/storage` is the file-storage abstraction that powers Pruvious uploads. It speaks to three backends through a single interface - local filesystem, Cloudflare R2, and any S3-compatible bucket - and supports both direct uploads and multipart uploads for large files.

You can use the package on its own whenever you need a portable storage layer with uniform error handling.

## Installation

```sh
npm install @pruvious/storage
```

## Quick start

```ts
import { Storage } from '@pruvious/storage'

const storage = new Storage({ driver: 'fs://.uploads' })

await storage.put('hello world', '/notes/hello.txt')
const file = await storage.get('/notes/hello.txt')
```

Every method returns a `Result<T>`:

```ts
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string }
```

This keeps the error model identical across drivers.

## Drivers

The `driver` option accepts a connection string or a driver instance.

| Driver | Format |
| :--- | :--- |
| Local FS | `fs://path/to/uploads` |
| Cloudflare R2 | `r2://BINDING` or an `R2Bucket` instance |
| AWS S3 | `s3://KEY:SECRET@s3.amazonaws.com/bucket?region=us-east-1&ssl=true` |
| DigitalOcean Spaces | `s3://KEY:SECRET@nyc3.digitaloceanspaces.com/bucket?region=nyc3&ssl=true` |
| MinIO | `s3://KEY:SECRET@play.min.io/bucket?region=us-east-1` |

```ts
// Local
new Storage({ driver: 'fs://.uploads' })

// R2 inside a Worker
export default {
  fetch(request, env) {
    const storage = new Storage({ driver: env.UPLOADS })
  },
}

// S3
new Storage({
  driver: 's3://AKIA...:SECRET@s3.amazonaws.com/my-bucket?region=us-east-1&ssl=true',
})
```

## Methods

All methods are async and return a `Result`. File data accepts `string`, `Buffer`, or `Uint8Array`.

### `put(file, path)`

Store a file. Returns the normalized location and metadata.

```ts
await storage.put(buffer, '/images/photo.webp')
// {
//   success: true,
//   data: {
//     path: '/images/photo.webp',
//     dir:  '/images',
//     name: 'photo.webp',
//     ext:  'webp',
//     size: 1024,
//     etag: '...',
//   },
// }
```

### `get(path)`

Read a file into memory.

```ts
const result = await storage.get('/images/photo.webp')
if (result.success) {
  result.data.file   // Buffer
  result.data.size   // bytes
  result.data.etag
}
```

### `stream(path, start?, end?)`

Stream a file (a `ReadStream` on FS, a `ReadableStream` on R2 / S3). Optional `start` and `end` byte offsets read a slice.

```ts
const stream = await storage.stream('/movies/intro.mp4', 0, 1023)
// returns the first 1024 bytes
```

### `move(from, to)`

Rename or move a file. The original is gone afterwards.

```ts
await storage.move('/tmp/draft.md', '/posts/2025/draft.md')
```

### `delete(path)`

Delete a file. Returns `{ success: true }` even if the file did not exist (idempotent), or `{ success: false, error }` on a real error.

```ts
await storage.delete('/images/old.png')
```

### `meta(path)`

Return only the metadata (`size`, `etag`) for a file - no body. Useful for cache checks.

```ts
const meta = await storage.meta('/images/photo.webp')
```

## Multipart uploads

For files too large to send in one request, use the multipart flow:

```ts
// 1. Begin
const create = await storage.createMultipartUpload('/big.zip')
if (!create.success) throw new Error(create.error)
const { key } = create.data

// 2. Upload parts
const part1 = await storage.resumeMultipartUpload(chunk1, '/big.zip', key, 1)
const part2 = await storage.resumeMultipartUpload(chunk2, '/big.zip', key, 2)

// 3. Complete
await storage.completeMultipartUpload('/big.zip', key, [
  { partNumber: 1, etag: part1.data.etag },
  { partNumber: 2, etag: part2.data.etag },
])

// Or abort
await storage.abortMultipartUpload('/big.zip', key)
```

S3 and R2 implement this natively. The FS driver emulates the flow with temporary part files so the API is the same across backends.

## Result types in detail

```ts
import type {
  StorageFileLocation, // { path, dir, name, ext }
  Metadata,            // { size, etag }
  PutResult,           // Result<StorageFileLocation & Metadata>
  GetResult,           // Result<StorageFileLocation & { file } & Metadata>
  StreamResult,        // Result<StorageFileLocation & { stream, start?, end? } & Metadata>
  MoveResult,
  DeleteResult,
  MetaResult,
  CreateMultipartUploadResult,
  ResumeMultipartUploadResult,
  CompleteMultipartUploadResult,
  AbortMultipartUploadResult,
} from '@pruvious/storage'
```

## How Pruvious uses it

Pruvious wraps `@pruvious/storage` in its uploads layer. The driver you configure in `pruvious.uploads.driver` is the one passed to `new Storage(...)`. The dashboard's `upload()` and `useUpload()` composables transparently switch to multipart uploads above ~8 MB by calling the same methods documented here.

## Next steps

- [Configuration: `uploads`](../reference/configuration.md#uploads) - Driver and limits
- [Composables: uploads](../api/composables.md#uploads-upload-and-useupload) - Vue-side helpers
- [REST API: uploads](../api/rest.md#uploads) - HTTP endpoints
