import { Pool, type PoolClient } from "pg";

const globalDb = globalThis as typeof globalThis & { familyRecipePool?: Pool };
export function db() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  return globalDb.familyRecipePool ??= new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
}

export async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
