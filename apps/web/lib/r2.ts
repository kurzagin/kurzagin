import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
}

export function getR2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL || '';

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    return null;
  }

  // Ensure publicUrl doesn't have a trailing slash
  const cleanPublicUrl = publicUrl.replace(/\/+$/, '');

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicUrl: cleanPublicUrl,
  };
}

export function isR2Configured(): boolean {
  return getR2Config() !== null;
}

let cachedS3Client: S3Client | null = null;

export function getR2Client(): { client: S3Client; config: R2Config } | null {
  const config = getR2Config();
  if (!config) return null;

  if (!cachedS3Client) {
    cachedS3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  return { client: cachedS3Client, config };
}

/**
 * Returns the full public URL for a given R2 storage key.
 */
export function getR2PublicUrl(key: string): string {
  const config = getR2Config();
  if (!config || !config.publicUrl) {
    return `/${key}`;
  }
  return `${config.publicUrl}/${key.replace(/^\/+/, '')}`;
}

/**
 * Generates a presigned PUT URL for direct client-to-R2 upload (ideal for Opus audio files).
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string = 'audio/ogg; codecs=opus',
  expiresInSeconds: number = 3600
): Promise<{ uploadUrl: string; publicUrl: string; key: string } | null> {
  const r2 = getR2Client();
  if (!r2) return null;

  // Note: We omit ContentType from the presigned command signature.
  // This allows the browser client to send Content-Type without risk of
  // AWS S3 SignatureDoesNotMatch if browser headers differ in spacing or codec parameters.
  // Cloudflare R2 will still save and serve the Content-Type provided by the client PUT.
  const command = new PutObjectCommand({
    Bucket: r2.config.bucketName,
    Key: key,
  });

  const uploadUrl = await getSignedUrl(r2.client, command, { expiresIn: expiresInSeconds });
  const publicUrl = getR2PublicUrl(key);

  return { uploadUrl, publicUrl, key };
}

/**
 * Uploads a Buffer directly to R2 (used for processed AVIF album artwork).
 */
export async function uploadBufferToR2(
  key: string,
  buffer: Buffer | Uint8Array,
  contentType: string
): Promise<string | null> {
  const r2 = getR2Client();
  if (!r2) return null;

  const command = new PutObjectCommand({
    Bucket: r2.config.bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await r2.client.send(command);
  return getR2PublicUrl(key);
}

/**
 * Deletes a file from R2.
 */
export async function deleteR2Object(key: string): Promise<boolean> {
  const r2 = getR2Client();
  if (!r2) return false;

  try {
    const command = new DeleteObjectCommand({
      Bucket: r2.config.bucketName,
      Key: key,
    });
    await r2.client.send(command);
    return true;
  } catch (err) {
    console.error(`Failed to delete object from R2 (${key}):`, err);
    return false;
  }
}
