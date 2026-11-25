import { findOriginal } from "@/server/archive";
import { requireUser } from "@/server/auth";
import { failure, privateHeaders, RequestError } from "@/server/http";
import { imageLink } from "@/server/storage";

export async function GET(request: Request, { params }: { params: Promise<{ id: string; source: string }> }) {
  try {
    const query = new URL(request.url).searchParams;
    const review = query.has("review");
    const download = query.has("download");
    const user = await requireUser(review || download);
    const { id, source } = await params;
    const original = await findOriginal(id, source, user, review);
    if (!original) throw new RequestError(404, "Η πηγή δεν βρέθηκε.");
    const format = original.content_type.split("/")[1];
    const filename = download ? `prototypo-${source}.${format === "jpeg" ? "jpg" : format}` : undefined;
    return new Response(null, { status: 307, headers: { ...privateHeaders, Location: await imageLink(original.object_key, filename) } });
  } catch (error) { return failure(error); }
}
