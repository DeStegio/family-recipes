import "./env";
import { readFile, readdir } from "node:fs/promises";
import { db, transaction } from "../src/server/db";

async function migrate() {
  const paths = (await readdir("migrations")).filter((name) => name.endsWith(".sql")).sort();
  await transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(49287315)");
    await client.query("CREATE TABLE IF NOT EXISTS schema_migration (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
    for (const name of paths) {
      const { rowCount } = await client.query("SELECT 1 FROM schema_migration WHERE name = $1", [name]);
      if (rowCount) continue;
      await client.query(await readFile("migrations/" + name, "utf8"));
      await client.query("INSERT INTO schema_migration (name) VALUES ($1)", [name]);
      console.log("Applied", name);
    }
  });
}
migrate().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db().end());
