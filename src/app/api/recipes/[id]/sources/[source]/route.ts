import { findOriginal } from "@/server/archive";
import { requireUser } from "@/server/auth";
import { failure, privateHeaders, RequestError } from "@/server/http";
import { imageLink } from "@/server/storage";

export async function GET(request: Request, { params }: { params: Promise<{ id: string; source: string }> }) {
  try {
    const user = await requireUser(new URL(request.url).searchParams.has("review"));
    const { id, source } = await params;
    const key = await findOriginal(id, source, user, new URL(request.url).searchParams.has("review"));
    if (!key) throw new RequestError(404, "Η πηγή δεν βρέθηκε.");
    return new Response(null, { status: 307, headers: { ...privateHeaders, Location: await imageLink(key) } });
  } catch (error) { return failure(error); }
}
