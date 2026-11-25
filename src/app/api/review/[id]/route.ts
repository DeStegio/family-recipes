import { decisionSchema } from "@/domain/review";
import { decide, reviewDetail } from "@/server/archive";
import { requireOrigin, requireUser } from "@/server/auth";
import { failure, json, RequestError } from "@/server/http";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser(true);
    const data = await reviewDetail((await params).id);
    if (!data) throw new RequestError(404, "Το προσχέδιο δεν βρέθηκε.");
    return json(data);
  } catch (error) { return failure(error); }
}
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireOrigin(request);
    const user = await requireUser(true);
    const input = decisionSchema.parse(await request.json());
    const id = await decide((await params).id, user, input);
    return json({ id });
  } catch (error) { return failure(error); }
}
