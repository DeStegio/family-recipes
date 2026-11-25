import { demoRecipes } from "@/domain/fixtures";
import { publishedRecipe } from "@/server/archive";
import { requireUser } from "@/server/auth";
import { demoMode } from "@/server/config";
import { failure, json, RequestError } from "@/server/http";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!demoMode()) await requireUser();
    const { id } = await params;
    const recipe = demoMode() ? demoRecipes.find((item) => item.id === id) : await publishedRecipe(id);
    if (!recipe) throw new RequestError(404, "Η συνταγή δεν βρέθηκε.");
    return json(recipe);
  } catch (error) { return failure(error); }
}
