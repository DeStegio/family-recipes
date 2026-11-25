import { createHash } from "node:crypto";
import { mkdtemp, rm, rmdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { manifestSchema, matchManifest, readBackupFile } from "../../scripts/original-backup";

const id = "3e4de8dc-dd11-4d2d-8542-245d107c7a72";
const bytes = Buffer.from("sample");
const item = {
  id, object_key: `originals/${id}`, content_type: "image/png" as const,
  sha256: createHash("sha256").update(bytes).digest("hex"), size_bytes: bytes.length,
};

it("accepts existing exports and rejects unrelated manifests, duplicates and invalid paths", () => {
  expect(() => matchManifest([item], manifestSchema.parse([item]))).not.toThrow();
  expect(() => matchManifest([item], [])).toThrow();
  expect(() => matchManifest([item], [item, item])).toThrow();
  expect(() => matchManifest([item], [{ ...item, sha256: "f".repeat(64) }])).toThrow();
  expect(manifestSchema.safeParse([{ ...item, object_key: "../other.png" }]).success).toBe(false);
});

it("checks the bytes against the database before restoring an object", async () => {
  const folder = await mkdtemp(join(tmpdir(), "recipes-unit-"));
  try {
    await writeFile(join(folder, id), bytes);
    expect(await readBackupFile(folder, item)).toEqual(bytes);
    await writeFile(join(folder, id), "alter!");
    await expect(readBackupFile(folder, item)).rejects.toThrow("Checksum");
  } finally {
    await rm(join(folder, id), { force: true });
    await rmdir(folder);
  }
});
