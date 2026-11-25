import "./env";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { db } from "../src/server/db";
import { listOriginals, readStoredOriginal } from "./original-backup";

async function exportOriginals() {
  if (!process.argv[2]) throw new Error("Pass a new private destination directory.");
  const destination = resolve(process.argv[2]);
  await mkdir(destination);
  const items = await listOriginals();
  for (const item of items) {
    await writeFile(join(destination, item.id), await readStoredOriginal(item), { flag: "wx" });
  }
  await writeFile(join(destination, "manifest.json"), JSON.stringify(items, null, 2) + "\n", { flag: "wx" });
  console.log(`Exported ${items.length} originals with verified checksums.`);
}
exportOriginals().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => process.env.DATABASE_URL && db().end());
