import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getModuleOption } from './state'

let client: S3Client | undefined

export function s3Client() {
  if (!client) {
    const options = getModuleOption('uploads')

    if (options.drive.type !== 's3') {
      throw new Error('The S3 client is only available when using the S3 drive')
    }

    client = new S3Client({
      credentials: {
        accessKeyId: options.drive.key,
        secretAccessKey: options.drive.secret,
      },
      endpoint: options.drive.endpoint,
      forcePathStyle: !!options.drive.forcePathStyle,
      region: options.drive.region,
    })
  }

  return client
}

export async function s3PutObject(key: string, body: string | Buffer, contentType: string) {
  await s3Client().send(
    new PutObjectCommand({
      Bucket: (getModuleOption('uploads').drive as any).bucket,
      Key: key.replace(/^\//, ''),
      Body: body,
      ContentType: contentType,
      ACL: 'public-read',
    }),
  )
}

export async function s3GetObject(key: string) {
  const response = await s3Client().send(
    new GetObjectCommand({
      Bucket: (getModuleOption('uploads').drive as any).bucket,
      Key: key.replace(/^\//, ''),
    }),
  )

  return response.Body?.transformToByteArray()
}

export async function s3MoveObject(from: string, to: string) {
  const response = await s3Client().send(
    new CopyObjectCommand({
      Bucket: (getModuleOption('uploads').drive as any).bucket,
      CopySource: `${(getModuleOption('uploads').drive as any).bucket}/${from}`,
      Key: to.replace(/^\//, ''),
      ACL: 'public-read',
    }),
  )

  if (response.$metadata.httpStatusCode === 200) {
    await s3DeleteObject(from.replace(/^\//, ''))
  }
}

export async function s3DeleteObject(key: string) {
  await s3Client().send(
    new DeleteObjectCommand({
      Bucket: (getModuleOption('uploads').drive as any).bucket,
      Key: key.replace(/^\//, ''),
    }),
  )
}
