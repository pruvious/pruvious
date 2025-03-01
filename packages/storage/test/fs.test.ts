import fs from 'node:fs'
import { assert, describe, expect, test } from 'vitest'
import { Storage, StreamResult } from '../src'

describe('fs storage', () => {
  const tmp = 'packages/storage/test/tmp'
  const storage = new Storage({ driver: `fs://${tmp}` })

  if (fs.existsSync(tmp)) {
    fs.rmSync(tmp, { recursive: true })
  }

  test('put/get/delete file', async () => {
    const putSuccess = {
      success: true,
      data: {
        path: '/foo.txt',
        dir: '/',
        name: 'foo.txt',
        ext: 'txt',
        size: 3,
        etag: expect.stringMatching(/^W\/"[0-9\.-]+"$/),
      },
    }
    const getSuccess = (content: string) => ({
      success: true,
      data: { ...putSuccess.data, file: Buffer.from(content) },
    })

    expect(await storage.put(Buffer.from('foo'), '/foo.txt')).toEqual(putSuccess)
    expect(await storage.get(' FOO.TXT /')).toEqual(getSuccess('foo'))
    expect(await storage.put('FOO', 'Foo.txt')).toEqual(putSuccess)
    expect(await storage.get('foo.txt')).toEqual(getSuccess('FOO'))
    expect(await storage.delete('/foo.txt')).toEqual({ success: true, data: undefined })
    expect(await storage.get('/foo.txt')).toEqual({ success: false, error: 'File not found' })
    expect(await storage.delete('/foo.txt')).toEqual({ success: true, data: undefined })
    expect(await storage.put('FOO', 'Foo.txt')).toEqual(putSuccess)
    expect(await storage.get(' foo.TXT ')).toEqual(getSuccess('FOO'))
    expect(await storage.delete('/foo.txt')).toEqual({ success: true, data: undefined })
    expect(await storage.put('BAR', '///foo.txt///')).toEqual(putSuccess)
    expect(await storage.get('//foo.txt//')).toEqual(getSuccess('BAR'))
    expect(await storage.put(true as any, '/bar.txt')).toEqual({ success: false, error: expect.any(String) })
    expect(await storage.get('/bar.txt')).toEqual({ success: false, error: 'File not found' })
    expect(await storage.put('baz', 'baz')).toEqual({
      success: true,
      data: {
        path: '/baz',
        dir: '/',
        name: 'baz',
        ext: '',
        size: 3,
        etag: expect.stringMatching(/^W\/"[0-9\.-]+"$/),
      },
    })
    expect(await storage.get('baz')).toEqual({
      success: true,
      data: {
        path: '/baz',
        dir: '/',
        name: 'baz',
        ext: '',
        file: Buffer.from('baz'),
        size: 3,
        etag: expect.stringMatching(/^W\/"[0-9\.-]+"$/),
      },
    })
  })

  test('metadata', async () => {
    expect(await storage.put('FOO', '/ META // foo.txt')).toEqual({
      success: true,
      data: {
        path: '/meta/foo.txt',
        dir: '/meta',
        name: 'foo.txt',
        ext: 'txt',
        size: 3,
        etag: expect.stringMatching(/^W\/"[0-9\.-]+"$/),
      },
    })
    expect(await storage.meta('/meta/foo.txt')).toEqual({
      success: true,
      data: { size: 3, etag: expect.stringMatching(/^W\/"[0-9\.-]+"$/) },
    })
    expect(await storage.meta('/meta/bar.txt')).toEqual({ success: false, error: 'File not found' })
  })

  test('stream', async () => {
    expect(await storage.put('FOO', '/stream/foo.txt')).toEqual({
      success: true,
      data: {
        path: '/stream/foo.txt',
        dir: '/stream',
        name: 'foo.txt',
        ext: 'txt',
        size: 3,
        etag: expect.stringMatching(/^W\/"[0-9\.-]+"$/),
      },
    })

    const streamResult = (await storage.stream('/stream/foo.txt')) as StreamResult & { success: true }
    expect(streamResult).toEqual({
      success: true,
      data: {
        stream: expect.any(fs.ReadStream),
        path: '/stream/foo.txt',
        dir: '/stream',
        name: 'foo.txt',
        ext: 'txt',
        size: 3,
        etag: expect.stringMatching(/^W\/"[0-9\.-]+"$/),
      },
    })
    const stream = streamResult.data.stream as fs.ReadStream
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(chunk)
    }
    expect(Buffer.concat(chunks).toString()).toBe('FOO')

    const streamRangeResult = (await storage.stream('/stream/foo.txt', 1, 2)) as StreamResult & { success: true }
    expect(streamRangeResult).toEqual({
      success: true,
      data: {
        stream: expect.any(fs.ReadStream),
        path: '/stream/foo.txt',
        dir: '/stream',
        name: 'foo.txt',
        ext: 'txt',
        size: 3,
        etag: expect.stringMatching(/^W\/"[0-9\.-]+"$/),
        start: 1,
        end: 2,
      },
    })
    const streamRange = streamRangeResult.data.stream as fs.ReadStream
    const rangeChunks: Buffer[] = []
    for await (const chunk of streamRange) {
      rangeChunks.push(chunk)
    }
    expect(Buffer.concat(rangeChunks).toString()).toBe('OO')

    expect(await storage.stream('/stream/bar.txt')).toEqual({ success: false, error: 'File not found' })
  })

  test('move', async () => {
    expect(await storage.put('FOO', '/source/foo.txt')).toEqual({
      success: true,
      data: {
        path: '/source/foo.txt',
        dir: '/source',
        name: 'foo.txt',
        ext: 'txt',
        size: 3,
        etag: expect.stringMatching(/^W\/"[0-9\.-]+"$/),
      },
    })

    expect(await storage.move('/source/foo.txt', '/target/bar.txt')).toEqual({
      success: true,
      data: {
        path: '/target/bar.txt',
        dir: '/target',
        name: 'bar.txt',
        ext: 'txt',
        size: 3,
        etag: expect.stringMatching(/^W\/"[0-9\.-]+"$/),
      },
    })

    expect(await storage.move('/source/foo.txt', '/target/bar.txt')).toEqual({
      success: false,
      error: 'File not found',
    })

    expect(await storage.get('/source/foo.txt')).toEqual({ success: false, error: 'File not found' })
    expect(await storage.get('/target/bar.txt')).toEqual({
      success: true,
      data: {
        path: '/target/bar.txt',
        dir: '/target',
        name: 'bar.txt',
        ext: 'txt',
        file: Buffer.from('FOO'),
        size: 3,
        etag: expect.stringMatching(/^W\/"[0-9\.-]+"$/),
      },
    })
  })

  test('multipart upload', async () => {
    const largeFile = new Uint8Array(6 * 1024 * 1024).fill('a'.charCodeAt(0))
    const multipartUpload = await storage.createMultipartUpload('/large-file.txt')
    const key = multipartUpload.success ? multipartUpload.data.key : ''
    const etags: string[] = []

    expect(multipartUpload).toEqual({ success: true, data: { key: expect.stringMatching(/^[a-z0-9]+$/i) } })

    const part1 = await storage.resumeMultipartUpload(largeFile.subarray(0, 5 * 1024 * 1024), '/large-file.txt', key, 1)
    const part2 = await storage.resumeMultipartUpload(largeFile.subarray(5 * 1024 * 1024), '/large-file.txt', key, 2)

    etags.push(part1.success ? part1.data.etag : '')
    etags.push(part2.success ? part2.data.etag : '')

    expect(part1).toEqual({
      success: true,
      data: { partNumber: 1, etag: expect.stringMatching(/^[a-z0-9]+-[1-9][0-9]*$/i) },
    })
    expect(part2).toEqual({
      success: true,
      data: { partNumber: 2, etag: expect.stringMatching(/^[a-z0-9]+-[1-9][0-9]*$/i) },
    })

    const completeMultipartUpload = await storage.completeMultipartUpload('/large-file.txt', key, [
      { partNumber: 1, etag: etags[0] },
      { partNumber: 2, etag: etags[1] },
    ])

    expect(completeMultipartUpload).toEqual({
      success: true,
      data: {
        path: '/large-file.txt',
        dir: '/',
        name: 'large-file.txt',
        ext: 'txt',
        size: 6 * 1024 * 1024,
        etag: expect.stringMatching(/^W\/"[0-9\.-]+"$/),
      },
    })

    const item = await storage.get('/large-file.txt')

    expect(await storage.get('/large-file.txt')).toEqual({
      success: true,
      data: {
        path: '/large-file.txt',
        dir: '/',
        name: 'large-file.txt',
        ext: 'txt',
        file: expect.any(Buffer),
        size: 6 * 1024 * 1024,
        etag: expect.stringMatching(/^W\/"[0-9\.-]+"$/),
      },
    })

    assert(item.success)
    expect(item.data.size).toBe(6 * 1024 * 1024)
    expect(item.data.file.length).toBe(6 * 1024 * 1024)
    expect(item.data.file[0]).toBe('a'.charCodeAt(0))
    expect(item.data.file[item.data.file.length - 1]).toBe('a'.charCodeAt(0))
    expect(item.data.file[Math.floor(item.data.file.length / 2)]).toBe('a'.charCodeAt(0))
  })

  test('abort multipart upload', async () => {
    const largeFile = new Uint8Array(6 * 1024 * 1024).fill('a'.charCodeAt(0))
    const multipartUpload = await storage.createMultipartUpload('/never.txt')
    const key = multipartUpload.success ? multipartUpload.data.key : ''

    expect(multipartUpload).toEqual({ success: true, data: { key: expect.stringMatching(/^[a-z0-9_-]+$/i) } })

    const part1 = await storage.resumeMultipartUpload(largeFile.subarray(0, 5 * 1024 * 1024), '/never.txt', key, 1)
    expect(part1.success).toBe(true)

    const abortMultipartUpload = await storage.abortMultipartUpload('/never.txt', key)
    expect(abortMultipartUpload).toEqual({ success: true, data: undefined })

    const part2 = await storage.resumeMultipartUpload(largeFile.subarray(5 * 1024 * 1024), '/never.txt', key, 2)
    expect(part2.success).toBe(false)

    const item = await storage.get('/never.txt')
    expect(item).toEqual({ success: false, error: 'File not found' })
  })
})
