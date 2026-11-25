import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { db } from "./db";
import { demoMode, sameOrigin } from "./config";
import { RequestError } from "./http";

const derive = promisify(scrypt);
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export const sessionCookie = "family_session";
export const sessionMaxAge = 60 * 60 * 24 * 7;
export type User = { id: string; email: string; role: "owner" | "admin" | "reader" };
export const canEdit = (user: User | null) => user?.role === "owner" || user?.role === "admin";

export async function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + ((await derive(password, salt, 64)) as Buffer).toString("hex");
}

async function verify(password: string, hash: string) {
  const [salt, expected] = hash.split(":");
  const result = (await derive(password, salt, 64)) as Buffer;
  return timingSafeEqual(result, Buffer.from(expected, "hex"));
}

export async function currentUser(): Promise<User | null> {
  if (demoMode() || !process.env.DATABASE_URL) return null;
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const { rows } = await db().query<User>(
    "SELECT a.id, a.email, a.role FROM account a JOIN session s ON s.account_id = a.id WHERE s.token_hash = $1 AND s.expires_at > now()",
    [digest(token)],
  );
  return rows[0] ?? null;
}

export async function requireUser(editor = false) {
  const user = await currentUser();
  if (!user) throw new RequestError(401, "Χρειάζεται σύνδεση.");
  if (editor && !canEdit(user)) throw new RequestError(403, "Η ενέργεια απαιτεί δικαιώματα διαχείρισης.");
  return user;
}

export function requireOrigin(request: Request) {
  if (!sameOrigin(request)) throw new RequestError(403, "Η προέλευση του αιτήματος δεν επιτρέπεται.");
}

export async function login(email: string, password: string) {
  const key = digest(email);
  const { rows: attempts } = await db().query<{ attempts: number }>(`
    INSERT INTO login_attempt (key, attempts, resets_at) VALUES ($1, 1, now() + interval '15 minutes')
    ON CONFLICT (key) DO UPDATE SET
      attempts = CASE WHEN login_attempt.resets_at <= now() THEN 1 ELSE login_attempt.attempts + 1 END,
      resets_at = CASE WHEN login_attempt.resets_at <= now() THEN excluded.resets_at ELSE login_attempt.resets_at END
    RETURNING attempts`, [key]);
  if (attempts[0].attempts > 10) throw new RequestError(429, "Δοκίμασε ξανά σε δεκαπέντε λεπτά.");
  const { rows } = await db().query<User & { password_hash: string }>(
    "SELECT id, email, role, password_hash FROM account WHERE email = $1", [email],
  );
  const user = rows[0];
  const valid = await verify(password, user?.password_hash ?? ("0".repeat(32) + ":" + "0".repeat(128)));
  if (!user || !valid) throw new RequestError(401, "Το email ή ο κωδικός δεν είναι σωστά.");
  const token = randomBytes(32).toString("hex");
  await db().query("DELETE FROM login_attempt WHERE key = $1", [key]);
  await db().query("INSERT INTO session VALUES ($1, $2, now() + $3 * interval '1 second')", [digest(token), user.id, sessionMaxAge]);
  return token;
}

export async function logout(token?: string) {
  if (token && process.env.DATABASE_URL && !demoMode()) await db().query("DELETE FROM session WHERE token_hash = $1", [digest(token)]);
}
