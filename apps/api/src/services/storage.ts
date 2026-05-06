import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logger } from "../utils/logger";

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? "auto",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? "",
    secretAccessKey: process.env.S3_SECRET_KEY ?? "",
  },
  forcePathStyle: true,
});

const BUCKET = process.env.S3_BUCKET ?? "damned-uploads";
const PUBLIC_URL = process.env.S3_PUBLIC_URL ?? "";

export const storageService = {
  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
    return PUBLIC_URL ? `${PUBLIC_URL}/${key}` : key;
  },

  async getSignedUrl(keyOrUrl: string, expiresIn = 3600): Promise<string> {
    // If it's already a full public URL, return as-is
    if (keyOrUrl.startsWith("http")) return keyOrUrl;

    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: BUCKET, Key: keyOrUrl }),
      { expiresIn }
    );
    return url;
  },

  async delete(key: string): Promise<void> {
    await s3
      .send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
      .catch((err) => logger.error("Failed to delete S3 object", err));
  },
};
