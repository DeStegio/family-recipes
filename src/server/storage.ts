import { createHash, randomUUID } from "node:crypto";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";
import { RequestError } from "./http";

export const maxFileBytes = 8 * 1024 * 1024;
export const maxFiles = 6;
const formats = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" } as const;
export type Original = { id: string; objectKey: string; hash: string; contentType: string; size: number };
type Prepared = Original & { bytes: Buffer };
let client: S3Client | undefined;

export function storage() {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error("S3_BUCKET is required");
  const endpoint = process.env.S3_ENDPOINT;
  client ??= new S3Client({ region: process.env.AWS_REGION ?? "us-east-1", endpoint,
    forcePathStyle: Boolean(endpoint), requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED" });
  return { client, bucket };
}

export async function prepareOriginal(bytes: Buffer, id = randomUUID()): Promise<Prepared> {
  if (!bytes.length || bytes.length > maxFileBytes) throw new RequestError(413, "Κάθε φωτογραφία μπορεί να είναι έως 8 MB.");
  let format: string | undefined;
  try {
    const image = sharp(bytes, { limitInputPixels: 40_000_000, failOn: "error" });
    const metadata = await image.metadata();
    format = metadata.format;
    if (!metadata.width || !metadata.height || metadata.width * metadata.height > 40_000_000 || (metadata.pages ?? 1) > 1) throw new Error("Image dimensions");
    if (format && Object.hasOwn(formats, format)) await image.stats();
  } catch { throw new RequestError(400, "Μία φωτογραφία δεν μπορεί να διαβαστεί."); }
  if (!format || !Object.hasOwn(formats, format)) throw new RequestError(400, "Επίλεξε φωτογραφίες JPG, PNG ή WebP.");
  return { id, objectKey: `originals/${id}`, hash: createHash("sha256").update(bytes).digest("hex"),
    contentType: formats[format as keyof typeof formats], size: bytes.length, bytes };
}

export async function putOriginal({ bytes, ...original }: Prepared): Promise<Original> {
  const { bucket, client } = storage();
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: original.objectKey, Body: bytes,
    ContentType: original.contentType, CacheControl: "private, no-store", IfNoneMatch: "*" }));
  return original;
}

export async function imageLink(key: string) {
  const { bucket, client } = storage();
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 60 });
}
