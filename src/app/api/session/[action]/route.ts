import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { login, logout, requireOrigin, sessionCookie, sessionMaxAge } from "@/server/auth";
import { demoMode, siteOrigin } from "@/server/config";
import { failure, privateHeaders, RequestError } from "@/server/http";

const credentials = z.object({ email: z.email().max(254), password: z.string().min(1).max(256) });

export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  try {
    requireOrigin(request);
    const { action } = await params;
    const destination = (path: string) => new URL(path, siteOrigin(request));
    const secure = destination("/").protocol === "https:";
    if (!process.env.DATABASE_URL || demoMode()) throw new RequestError(404, "Η σύνδεση είναι διαθέσιμη στην ιδιωτική λειτουργία.");
    if (action === "logout") {
      await logout((await cookies()).get(sessionCookie)?.value);
      const response = NextResponse.redirect(destination("/login"), { status: 303, headers: privateHeaders });
      response.cookies.set(sessionCookie, "", { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 0 });
      return response;
    }
    if (action !== "login") throw new RequestError(404, "Η ενέργεια δεν βρέθηκε.");
    const form = await request.formData();
    const result = credentials.safeParse({ email: String(form.get("email") ?? "").trim().toLowerCase(), password: form.get("password") });
    if (!result.success) return NextResponse.redirect(destination("/login?error=invalid"), { status: 303, headers: privateHeaders });
    try {
      const token = await login(result.data.email, result.data.password);
      const response = NextResponse.redirect(destination("/"), { status: 303, headers: privateHeaders });
      response.cookies.set(sessionCookie, token, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: sessionMaxAge });
      return response;
    } catch (error) {
      if (error instanceof RequestError) return NextResponse.redirect(destination(error.status === 429 ? "/login?error=limit" : "/login?error=invalid"), { status: 303, headers: privateHeaders });
      throw error;
    }
  } catch (error) { return failure(error); }
}
