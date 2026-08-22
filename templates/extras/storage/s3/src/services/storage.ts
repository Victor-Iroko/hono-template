import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let s3ClientInstance: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({
      region: process.env.S3_REGION || "us-east-1",
      endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true" || true,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || "rustfsadmin",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "rustfsadmin",
      },
    });
  }
  return s3ClientInstance;
}

const DEFAULT_BUCKET = process.env.S3_BUCKET || "app-uploads";

export const storageService = {
  getSignedUploadUrl: async (
    key: string,
    contentType: string,
    expiresInSeconds: number = 300,
    bucket: string = DEFAULT_BUCKET
  ): Promise<string> => {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });
    return await getSignedUrl(getS3Client(), command, { expiresIn: expiresInSeconds });
  },

  getSignedDownloadUrl: async (
    key: string,
    expiresInSeconds: number = 3600,
    bucket: string = DEFAULT_BUCKET
  ): Promise<string> => {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    return await getSignedUrl(getS3Client(), command, { expiresIn: expiresInSeconds });
  },

  uploadBuffer: async (
    key: string,
    body: Uint8Array | Buffer,
    contentType: string,
    bucket: string = DEFAULT_BUCKET
  ): Promise<void> => {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    });
    await getS3Client().send(command);
  },

  deleteFile: async (
    key: string,
    bucket: string = DEFAULT_BUCKET
  ): Promise<void> => {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    await getS3Client().send(command);
  },
};
