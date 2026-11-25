import { redirect } from "next/navigation";
import { Catalog } from "@/components/catalog";
import { Shell } from "@/components/shell";
import { demoRecipes } from "@/domain/fixtures";
import { categories, type Category } from "@/domain/recipe";
import { publishedRecipes } from "@/server/archive";
import { canEdit, currentUser } from "@/server/auth";
import { demoMode } from "@/server/config";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const demo = demoMode();
  const user = await currentUser();
  if (!demo && !user) redirect("/login");
  const params = await searchParams;
  const category = typeof params.category === "string" && Object.hasOwn(categories, params.category) ? params.category as Category : undefined;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 160) : "";
  const view = params.view === "all" || params.view === "favorites" ? params.view : "home";
  const recipes = demo ? demoRecipes : await publishedRecipes();
  return <Shell demo={demo} editor={canEdit(user)} authenticated={!!user}>
    <Catalog recipes={recipes} query={query} view={view} category={category} />
  </Shell>;
}
