import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { passwordHash, requireOrigin, requireUser } from "@/server/auth";
import { siteOrigin } from "@/server/config";
import { db } from "@/server/db";
import { failure, privateHeaders, RequestError } from "@/server/http";

const account = z.object({ email: z.email().max(254), password: z.string().min(14).max(256), role: z.enum(["admin", "reader"]) });

export async function POST(request: Request) {
  try {
    requireOrigin(request);
    if ((await requireUser()).role !== "owner") throw new RequestError(403, "Η δημιουργία λογαριασμών απαιτεί δικαιώματα ιδιοκτήτη.");
    const form = await request.formData();
    const result = account.safeParse({ email: String(form.get("email") ?? "").trim().toLowerCase(), password: form.get("password"), role: form.get("role") });
    const forward = (status: string) => NextResponse.redirect(new URL("/review/accounts?status=" + status, siteOrigin(request)),
      { status: 303, headers: privateHeaders });
    if (!result.success) return forward("invalid");
    const { email, password, role } = result.data;
    const { rowCount } = await db().query("INSERT INTO account VALUES ($1,$2,$3,$4) ON CONFLICT (email) DO NOTHING",
      [randomUUID(), email, await passwordHash(password), role]);
    return forward(rowCount ? "created" : "exists");
  } catch (error) { return failure(error); }
}
