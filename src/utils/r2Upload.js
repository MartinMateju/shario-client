// util/r2Upload.js
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } =
  process.env;

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export const R2_BUCKET_NAME = R2_BUCKET;

export const uploadBufferToR2 = async ({
  key,
  buffer,
  contentType = "application/pdf",
  cacheControl = "public, max-age=31536000",
}) => {
  if (!key) throw new Error("uploadBufferToR2: missing key");
  if (!buffer || !Buffer.isBuffer(buffer))
    throw new Error("uploadBufferToR2: buffer must be a Buffer");

  const cmd = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: cacheControl,
  });

  await r2.send(cmd);
  return { key };
};
