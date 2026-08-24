import crypto from "node:crypto";
import {
  v2 as cloudinary,
  type UploadApiOptions,
  type UploadApiResponse,
  type ResourceType,
  type TransformationOptions,
} from "cloudinary";
import { env } from "../../../core/env-validation.js";

let _configured = false;

export function getCloudinary(): typeof cloudinary {
  if (_configured) return cloudinary;

  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  _configured = true;
  return cloudinary;
}

export type PresignedUploadResponse = {
  uploadUrl: string;
  folder: string;
  publicId: string;
  signature: string;
  apiKey: string;
  timestamp: number;
  expiresIn: number;
  allowedFormats: string;
};

export async function uploadImage(
  file: string,
  options?: UploadApiOptions
): Promise<UploadApiResponse> {
  const client = getCloudinary();
  return client.uploader.upload(file, { ...options, use_filename: true });
}

export async function deleteImage(publicId: string, resourceType: ResourceType = "image") {
  const client = getCloudinary();
  return client.uploader.destroy(publicId, { resource_type: resourceType });
}

export async function deleteImages(
  publicIds: string[],
  options?: { resourceType?: ResourceType }
): Promise<void> {
  if (publicIds.length === 0) return;
  const client = getCloudinary();
  const resourceType = options?.resourceType ?? "image";
  const chunkSize = 100;
  for (let i = 0; i < publicIds.length; i += chunkSize) {
    const chunk = publicIds.slice(i, i + chunkSize);
    await client.api.delete_resources(chunk, { resource_type: resourceType });
  }
}

export function getImageUrl(
  publicId: string,
  options?: {
    transformation?: TransformationOptions;
    resourceType?: ResourceType;
  }
): string {
  const client = getCloudinary();
  const resourceType = options?.resourceType ?? "image";
  const transformation = options?.transformation ?? {};
  return client.url(publicId, {
    resource_type: resourceType,
    transformation,
    secure: true,
  });
}

export async function getImageInfo(publicId: string, resourceType: ResourceType = "image") {
  const client = getCloudinary();
  return client.api.resource(publicId, { resource_type: resourceType });
}

export async function generatePresignedUpload(
  folder: string,
  allowedFormats: string[] = ["jpg", "jpeg", "png", "webp"],
  expirationMinutes = 15
): Promise<PresignedUploadResponse> {
  getCloudinary();
  const timestamp = Math.floor(Date.now() / 1000) + expirationMinutes * 60;
  const publicId = crypto.randomBytes(16).toString("hex");

  const paramsToSign: Record<string, string | number> = {
    public_id: publicId,
    folder,
    timestamp,
    allowed_formats: allowedFormats.join(","),
  };

  const apiSecret = env.CLOUDINARY_API_SECRET;
  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);
  const cloudName = env.CLOUDINARY_CLOUD_NAME;
  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

  return {
    uploadUrl,
    publicId,
    signature,
    apiKey: env.CLOUDINARY_API_KEY,
    timestamp,
    folder,
    expiresIn: expirationMinutes * 60,
    allowedFormats: allowedFormats.join(","),
  };
}

export const storageService = {
  uploadImage,
  deleteImage,
  deleteImages,
  getImageUrl,
  getImageInfo,
  generatePresignedUpload,
  getClient: getCloudinary,
};
