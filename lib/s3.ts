import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const s3Endpoint = process.env.S3_ENDPOINT || 'https://storage.sarpadang.my.id'
const s3Bucket = process.env.S3_BUCKET || 'sar-project-bucket'
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || ''
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || ''
const region = process.env.AWS_REGION || 'us-east-1'

export const s3Client = new S3Client({
    endpoint: s3Endpoint,
    region: region,
    credentials: {
        accessKeyId,
        secretAccessKey,
    },
    forcePathStyle: true, // Required for MinIO
})

/**
 * Uploads a base64 encoded photo to MinIO S3 bucket and returns the public URL.
 */
export async function uploadCheckInPhoto(
    sessionId: string,
    employeeId: string,
    photoBase64: string
): Promise<string> {
    if (!photoBase64.includes(',')) {
        throw new Error('Format data foto tidak valid')
    }

    const base64Data = photoBase64.split(',')[1]
    const buffer = Buffer.from(base64Data, 'base64')

    const timestamp = Date.now()
    const key = `check-in-photos/${sessionId}/${employeeId}_${timestamp}.jpg`

    const command = new PutObjectCommand({
        Bucket: s3Bucket,
        Key: key,
        Body: buffer,
        ContentType: 'image/jpeg',
    })

    await s3Client.send(command)

    // Form public URL (MinIO with path style)
    const cleanEndpoint = s3Endpoint.replace(/\/$/, '')
    const publicUrl = `${cleanEndpoint}/${s3Bucket}/${key}`

    return publicUrl
}
