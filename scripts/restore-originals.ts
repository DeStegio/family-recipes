import "./env";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { db } from "../src/server/db";
import { putOriginal } from "../src/server/storage";
import { listOriginals, manifestSchema, matchManifest, readBackupFile, readStoredOriginal } from "./original-backup";

async function restoreOriginals() {
  if (!process.argv[2]) throw new Error("Pass the exported originals directory.");
  const source = resolve(process.argv[2]);
  const manifest = manifestSchema.parse(JSON.parse(await readFile(join(source, "manifest.json"), "utf8")));
  const originals = await listOriginals();
  matchManifest(originals, manifest);
  for (const item of originals) await readBackupFile(source, item);

  let uploaded = 0;
  for (const item of originals) {
    const bytes = Buffer.from(await readBackupFile(source, item));
    try {
      await putOriginal({
        id: item.id, objectKey: item.object_key, hash: item.sha256, contentType: item.content_type, size: item.size_bytes, bytes,
      });
      uploaded++;
    } catch (error) {
      if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode !== 412) throw error;
      // A previous attempt may have written the key. Verify the existing object before accepting it.
    }
    await readStoredOriginal(item);
  }
  console.log(`Verified ${originals.length} originals, uploaded ${uploaded}, reused ${originals.length - uploaded}.`);
}
restoreOriginals().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => process.env.DATABASE_URL && db().end());
