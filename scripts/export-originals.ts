import "./env";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { db } from "../src/server/db";
import { storage } from "../src/server/storage";

async function exportOriginals() {
  if (!process.argv[2]) throw new Error("Pass a new private destination directory.");
  const destination = resolve(process.argv[2]);
  await mkdir(destination);
  const { bucket, client } = storage();
  const { rows } = await db().query<{ id: string; object_key: string; content_type: string; sha256: string }>(
    "SELECT id, object_key, content_type, sha256 FROM original ORDER BY id",
  );
  for (const item of rows) {
    const { Body } = await client.send(new GetObjectCommand({ Bucket: bucket, Key: item.object_key }));
    if (!Body) throw new Error(`Missing object ${item.id}`);
    const bytes = await Body.transformToByteArray();
    const hash = createHash("sha256").update(bytes).digest("hex");
    if (hash !== item.sha256) throw new Error(`Checksum mismatch for ${item.id}`);
    await writeFile(join(destination, item.id), bytes, { flag: "wx" });
  }
  await writeFile(join(destination, "manifest.json"), JSON.stringify(rows, null, 2) + "\n", { flag: "wx" });
  console.log(`Exported ${rows.length} originals with verified checksums.`);
}
exportOriginals().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => process.env.DATABASE_URL && db().end());
