import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { demoMode } from "@/server/config";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!demoMode() || !["apple-1", "apple-2", "sout-1", "sout-2"].includes(id)) {
    return new Response(null, { status: 404 });
  }
  const bytes = await readFile(resolve("fixtures/images", id + ".png"));
  return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
