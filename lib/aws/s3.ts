import {
  S3Client,
  PutObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || '';

/* -------------------------------------------------------------------------- */
/*                         UPLOAD (EXISTING)                                   */
/* -------------------------------------------------------------------------- */

export async function generatePresignedUploadUrl(
  restaurantId: string,
  fileName: string,
  fileType: string
): Promise<{ uploadUrl: string; fileUrl: string }> {
  const key = `restaurants/${restaurantId}/${Date.now()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: fileType,
  });

  const uploadUrl = await getSignedUrl(
    s3Client,
    command,
    { expiresIn: 3600 }
  );

  const fileUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

  return { uploadUrl, fileUrl };
}

/* -------------------------------------------------------------------------- */
/*                         URL HELPER (EXISTING)                               */
/* -------------------------------------------------------------------------- */

export function getS3Url(key: string): string {
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

/* -------------------------------------------------------------------------- */
/*                         DELETE FILES (NEW)                                  */
/* -------------------------------------------------------------------------- */

export async function deleteS3Files(keys: string[]) {
  if (!keys || keys.length === 0) {
    return {
      deleted: [],
      errors: [],
    };
  }

  const response = await s3Client.send(
    new DeleteObjectsCommand({
      Bucket: BUCKET_NAME,
      Delete: {
        Objects: keys.map((key) => ({ Key: key })),
        Quiet: false,
      },
    })
  );

  return {
    deleted: response.Deleted ?? [],
    errors: response.Errors ?? [],
  };
}

export async function deleteS3File(key: string): Promise<{ success: boolean; error?: string }> {
  if (!key) {
    return { success: false, error: 'No key provided' };
  }

  try {
    const result = await deleteS3Files([key]);

    if (result.errors.length > 0) {
      return {
        success: false,
        error: result.errors[0].Message || 'Unknown error'
      };
    }

    return { success: true };
  } catch (error) {
    console.error('S3 delete error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export function extractS3Key(url: string): string {
  if (!url) return '';

  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    return pathname.startsWith('/') ? pathname.slice(1) : pathname;
  } catch {
    return '';
  }
}

