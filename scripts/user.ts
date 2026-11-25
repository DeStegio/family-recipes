import "./env";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { passwordHash } from "../src/server/auth";
import { db, transaction } from "../src/server/db";

async function createUser() {
  const email = z.email().max(254).parse(process.argv[2]?.trim().toLowerCase());
  const role = z.enum(["owner", "admin", "reader"]).parse(process.argv[3]);
  const password = z.string().min(14).max(256).parse(process.env.RECIPE_NEW_PASSWORD);
  const hash = await passwordHash(password);
  await transaction(async (client) => {
    const { rows } = await client.query<{ id: string }>(`
      INSERT INTO account (id, email, role, password_hash) VALUES ($1,$2,$3,$4)
      ON CONFLICT (email) DO UPDATE SET role = excluded.role, password_hash = excluded.password_hash RETURNING id`,
    [randomUUID(), email, role, hash]);
    await client.query("DELETE FROM session WHERE account_id = $1", [rows[0].id]);
  });
  console.log("Account saved.");
}
createUser().catch((error) => { console.error(error instanceof z.ZodError ? "Provide a valid email, role, and password of 14–256 characters in RECIPE_NEW_PASSWORD." : error); process.exitCode = 1; })
  .finally(() => process.env.DATABASE_URL && db().end());
