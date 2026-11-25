import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import { join } from "node:path";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { z } from "zod";
import { db } from "../src/server/db";
import { storage } from "../src/server/storage";

const entry = z.object({
  id: z.uuid().regex(/^[0-9a-f-]+$/),
  object_key: z.string(),
  content_type: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
}).refine((item) => item.object_key === `originals/${item.id}`);

export const manifestSchema = z.array(entry);
type Entry = z.infer<typeof entry>;
export type OriginalRow = Entry & { size_bytes: number };

export async function listOriginals() {
  const { rows } = await db().query<OriginalRow>(
    "SELECT id, object_key, content_type, sha256, size_bytes FROM original ORDER BY id",
  );
  return rows;
}

export function matchManifest(rows: OriginalRow[], manifest: Entry[]) {
  const indexed = new Map(manifest.map((item) => [item.id, item]));
  if (manifest.length !== rows.length || indexed.size !== rows.length
    || rows.some((row) => {
      const item = indexed.get(row.id);
      return item?.object_key !== row.object_key || item.content_type !== row.content_type || item.sha256 !== row.sha256;
    })) {
    throw new Error("The original manifest does not match the restored database.");
  }
}

function verify(original: OriginalRow, bytes: Uint8Array) {
  if (bytes.length !== original.size_bytes || createHash("sha256").update(bytes).digest("hex") !== original.sha256) {
    throw new Error(`Checksum or size mismatch for ${original.id}`);
  }
  return bytes;
}

export async function readBackupFile(directory: string, item: OriginalRow) {
  const path = join(directory, item.id);
  const info = await lstat(path);
  if (!info.isFile() || info.size !== item.size_bytes) throw new Error(`Invalid backup file for ${item.id}`);
  return verify(item, await readFile(path));
}

export async function readStoredOriginal(item: OriginalRow) {
  const { bucket, client } = storage();
  const { Body, ContentType } = await client.send(new GetObjectCommand({ Bucket: bucket, Key: item.object_key }));
  if (!Body || ContentType !== item.content_type) throw new Error(`Missing or invalid S3 object for ${item.id}`);
  return verify(item, await Body.transformToByteArray());
}
