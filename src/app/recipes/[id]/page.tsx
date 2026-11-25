import { notFound, redirect } from "next/navigation";
import { RecipeView } from "@/components/recipe-view";
import { Shell } from "@/components/shell";
import { demoRecipes } from "@/domain/fixtures";
import { publishedRecipe } from "@/server/archive";
import { canEdit, currentUser } from "@/server/auth";
import { demoMode } from "@/server/config";

export const dynamic = "force-dynamic";

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const demo = demoMode();
  const user = await currentUser();
  if (!demo && !user) redirect("/login");
  const { id } = await params;
  const recipe = demo ? demoRecipes.find((item) => item.id === id) : await publishedRecipe(id);
  if (!recipe) notFound();
  return <RecipeView recipe={recipe} editor={canEdit(user)} header={<Shell demo={demo} editor={canEdit(user)} authenticated={!!user}>{null}</Shell>} />;
}
