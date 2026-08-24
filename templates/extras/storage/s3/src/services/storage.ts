import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getEnv } from "../core/env-validation.js";

let _s3Client: S3Client | undefined;

export function getS3Client(): S3Client {
  const env = getEnv();
  return (
    _s3Client ??= new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: env.S3_FORCE_PATH_STYLE === "true",
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
    })
  );
}

export const storageService = {
  getSignedUploadUrl: async (
    key: string,
    contentType: string,
    expiresInSeconds: number = 300,
    bucket: string = getEnv().S3_BUCKET
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
    bucket: string = getEnv().S3_BUCKET
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
    bucket: string = getEnv().S3_BUCKET
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
    bucket: string = getEnv().S3_BUCKET
  ): Promise<void> => {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    await getS3Client().send(command);
  },
};
