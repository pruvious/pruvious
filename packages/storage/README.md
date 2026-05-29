# @pruvious/storage

Unified file storage interface for the local filesystem, Cloudflare R2, and any S3-compatible service.

A single `Storage` class hides the differences between drivers behind one API. Every operation returns a discriminated `Result` object (`{ success: true, data }` or `{ success: false, error }`), so callers never need to catch exceptions thrown by the underlying SDK.

## Installation

```sh
npm i @pruvious/storage
```

## Quick start

```ts
import { Storage } from '@pruvious/storage'

const storage = new Storage({ driver: 'fs://.uploads' })

const result = await storage.put(Buffer.from('Hello, World!'), '/greetings/hello.txt')

if (result.success) {
  console.log(result.data.path) // '/greetings/hello.txt'
  console.log(result.data.size) // 13
  console.log(result.data.etag) // 'W/"..."'
} else {
  console.error(result.error)
}
```

## Drivers

The active driver is selected by the `driver` option. Strings use a URI-style scheme, but you may also pass an `R2Bucket` instance directly.

| Scheme        | Example                                                                                | Notes                                                                                  |
| :------------ | :------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------- |
| `fs://`       | `fs://.uploads`                                                                        | Path is resolved relative to the current working directory.                            |
| `r2://`       | `r2://UPLOADS`                                                                         | `UPLOADS` is the name of the R2 binding exposed by the Workers runtime.                |
| `R2Bucket`    | `new Storage({ driver: env.UPLOADS })`                                                 | Bind an existing `R2Bucket` instance instead of resolving by name.                     |
| `s3://`       | `s3://ACCESS:SECRET@s3.amazonaws.com/my-bucket?region=us-east-1&ssl=true`              | Username/password are the access key and secret. The path is the bucket name.         |

The `s3://` driver is compatible with AWS S3, DigitalOcean Spaces, MinIO, and any service that speaks the S3 API. Extra query parameters are forwarded to the underlying `S3Client` constructor.

If `driver` is omitted, it defaults to `fs://.uploads`.

### Examples

```ts
// Local filesystem
new Storage({ driver: 'fs://.uploads' })

// Cloudflare R2 by binding name
new Storage({ driver: 'r2://UPLOADS' })

// Cloudflare R2 by binding instance
new Storage({ driver: env.UPLOADS })

// AWS S3
new Storage({ driver: 's3://AKIA...:SECRET@s3.amazonaws.com/my-bucket?region=us-east-1&ssl=true' })

// DigitalOcean Spaces
new Storage({ driver: 's3://KEY:SECRET@nyc3.digitaloceanspaces.com/my-bucket?region=nyc3&ssl=true' })

// MinIO
new Storage({ driver: 's3://KEY:SECRET@play.min.io/my-bucket?region=us-east-1' })
```

## Paths

Every method accepts a logical path string. Paths are normalized before they reach the driver:

- Leading and trailing slashes are stripped, then a single leading slash is re-applied.
- URI-encoded segments are decoded.
- Each segment is slugified (lowercase, kebab-case).
- The filename extension is snake-cased.

```ts
import { normalizePath, tryNormalizePath, parsePath } from '@pruvious/storage'

normalizePath('path/TO//MyImage.webp', 'file')
// '/path/to/my-image.webp'

normalizePath('/folder/SUB%20Folder/doc%20file.PDF', 'file')
// '/folder/sub-folder/doc-file.pdf'

tryNormalizePath('???', 'file')
// '???' (returned as-is when normalization fails)

parsePath('path/TO//MyImage.webp')
// {
//   path: '/path/to/my-image.webp',
//   dir: '/path/to',
//   name: 'my-image.webp',
//   ext: 'webp',
// }
```

## Result shape

All methods return a `Promise<Result<T>>`:

```ts
type Result<T> =
  | { success: true;  data: T }
  | { success: false; error: string }
```

Successful file operations include the normalized location and metadata:

```ts
{
  success: true,
  data: {
    path: '/path/to/my-image.webp',
    dir:  '/path/to',
    name: 'my-image.webp',
    ext:  'webp',
    size: 1024,
    etag: '...',
  },
}
```

## API

### `put(file, path)`

Stores a file at the given path. Accepts a `string`, `Buffer`, or `Uint8Array`.

```ts
await storage.put(buffer, '/images/photo.webp')
```

### `get(path)`

Returns the file bytes together with its location and metadata.

```ts
const result = await storage.get('/images/photo.webp')

if (result.success) {
  const { file, size, etag } = result.data
}
```

### `stream(path, start?, end?)`

Returns a `ReadStream` (filesystem) or `ReadableStream` (R2, S3). When `start` and `end` are provided, the stream yields the inclusive byte range only - useful for HTTP `Range` responses.

```ts
const result = await storage.stream('/videos/clip.mp4', 0, 1023)
```

### `move(from, to)`

Moves a file. On R2 and S3, the move is implemented as copy + delete because the underlying APIs do not expose a native rename operation. R2 uses multipart copies of 16 MiB chunks to handle large objects.

```ts
await storage.move('/tmp/upload.bin', '/archive/upload.bin')
```

### `delete(path)`

Removes a file. Returns `{ success: true }` even when the file does not exist on the filesystem driver, mirroring R2 and S3 semantics.

```ts
await storage.delete('/images/photo.webp')
```

### `meta(path)`

Returns `{ size, etag }` without reading the file body.

```ts
const result = await storage.meta('/images/photo.webp')
```

## Multipart uploads

Large uploads can be split into parts and assembled server-side. The workflow is the same across all three drivers:

```ts
const created = await storage.createMultipartUpload('/videos/big.mp4')
if (!created.success) throw new Error(created.error)

const { key } = created.data
const parts = []

for (let i = 0; i < chunks.length; i++) {
  const part = await storage.resumeMultipartUpload(chunks[i], '/videos/big.mp4', key, i + 1)
  if (!part.success) throw new Error(part.error)
  parts.push(part.data)
}

const completed = await storage.completeMultipartUpload('/videos/big.mp4', key, parts)
if (!completed.success) throw new Error(completed.error)
```

If the upload should be discarded:

```ts
await storage.abortMultipartUpload('/videos/big.mp4', key)
```

On the filesystem driver, part files are buffered under `<basePath>.multipart/<key>-parts/` and stitched together on completion. R2 and S3 use their native multipart APIs.

## Using a driver directly

The `FS`, `R2`, and `S3` classes all implement the same `Instance` interface and can be instantiated without going through `Storage`:

```ts
import { FS, R2, S3 } from '@pruvious/storage'

const fs = new FS('.uploads/')
const r2 = new R2(env.UPLOADS)
const s3 = new S3('s3://KEY:SECRET@s3.amazonaws.com/bucket?region=us-east-1&ssl=true')
```

## License

This package is licensed under the [MIT License](./LICENSE).
