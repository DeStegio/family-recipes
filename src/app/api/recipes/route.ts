import { z } from "zod";
import { demoRecipes } from "@/domain/fixtures";
import { matchesRecipe } from "@/domain/recipe";
import { draftSchema } from "@/domain/review";
import { createDraft, publishedRecipes } from "@/server/archive";
import { requireOrigin, requireUser } from "@/server/auth";
import { demoMode } from "@/server/config";
import { failure, json, RequestError } from "@/server/http";
import { maxFileBytes, maxFiles, prepareOriginal } from "@/server/storage";

export async function GET(request: Request) {
  try {
    if (!demoMode()) await requireUser();
    const recipes = demoMode() ? demoRecipes : await publishedRecipes();
    const query = new URL(request.url).searchParams.get("q")?.slice(0, 160) ?? "";
    return json(recipes.filter((recipe) => matchesRecipe(recipe, query)));
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const user = await requireUser(true);
    if (Number(request.headers.get("content-length")) > maxFiles * maxFileBytes + 1024 * 1024) {
      throw new RequestError(413, "Η εισαγωγή είναι πολύ μεγάλη.");
    }
    const form = await request.formData();
    const id = z.uuid().parse(form.get("id"));
    const draft = draftSchema.parse(JSON.parse(String(form.get("draft"))));
    const files = form.getAll("photos");
    if (files.length !== draft.sources.length || files.length > maxFiles || files.some((item) => typeof item === "string")) {
      throw new RequestError(400, "Επίλεξε έως έξι φωτογραφίες, μία για κάθε πηγή.");
    }
    const originals = [];
    for (const file of files as File[]) {
      if (file.size > maxFileBytes) throw new RequestError(413, "Κάθε φωτογραφία μπορεί να είναι έως 8 MB.");
      originals.push(await prepareOriginal(Buffer.from(await file.arrayBuffer())));
    }
    return json({ id: await createDraft(id, user, draft, originals) }, 201);
  } catch (error) { return failure(error); }
}
