import { S3Client } from "bun";
import { getEnv } from "../core/env-validation.js";

let _s3Client: S3Client | undefined;

export function getS3Client(): S3Client {
  const env = getEnv();
  return (
    _s3Client ??= new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      virtualHostedStyle: env.S3_FORCE_PATH_STYLE === "false",
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      bucket: env.S3_BUCKET,
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
    const file = getS3Client().file(key, { bucket });
    return file.presign({
      method: "PUT",
      type: contentType,
      expiresIn: expiresInSeconds,
    });
  },

  getSignedDownloadUrl: async (
    key: string,
    expiresInSeconds: number = 3600,
    bucket: string = getEnv().S3_BUCKET
  ): Promise<string> => {
    const file = getS3Client().file(key, { bucket });
    return file.presign({
      method: "GET",
      expiresIn: expiresInSeconds,
    });
  },

  uploadBuffer: async (
    key: string,
    body: Uint8Array | Buffer,
    contentType: string,
    bucket: string = getEnv().S3_BUCKET
  ): Promise<void> => {
    const file = getS3Client().file(key, { bucket, type: contentType });
    await file.write(body);
  },

  deleteFile: async (
    key: string,
    bucket: string = getEnv().S3_BUCKET
  ): Promise<void> => {
    const file = getS3Client().file(key, { bucket });
    await file.delete();
  },
};
