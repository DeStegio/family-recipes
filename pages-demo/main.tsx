/// <reference types="vite/client" />

import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "@fontsource-variable/noto-serif";
import "@/app/globals.css";
import { Catalog } from "@/components/catalog";
import { RecipeView } from "@/components/recipe-view";
import { Shell } from "@/components/shell";
import { demoRecipes } from "@/domain/fixtures";
import { categories, type Category } from "@/domain/recipe";
import apple1 from "../fixtures/images/apple-1.jpg?url";
import apple2 from "../fixtures/images/apple-2.jpg?url";
import sout1 from "../fixtures/images/sout-1.jpg?url";
import sout2 from "../fixtures/images/sout-2.jpg?url";
import Link from "./link";

const images = new Map([["apple-1", apple1], ["apple-2", apple2], ["sout-1", sout1], ["sout-2", sout2]]);
const recipes = demoRecipes.map((recipe) => ({
  ...recipe,
  sources: recipe.sources.map((source) => {
    const url = images.get(source.id);
    if (!url) throw new Error("Missing demo image: " + source.id);
    return { ...source, url };
  }),
}));

const params = new URLSearchParams(window.location.search);
const id = params.get("recipe");
const selected = recipes.find((recipe) => recipe.id === id);
const filter = params.get("category");
const category = filter && Object.hasOwn(categories, filter) ? filter as Category : undefined;
const query = params.get("q")?.trim().slice(0, 160) ?? "";
const requestedView = params.get("view");
const view = requestedView === "all" || requestedView === "favorites" ? requestedView : "home";
const demoNotice = "Δημόσια επίδειξη · Δοκιμαστικές συνταγές και εικόνες";

if (selected) document.title = `${selected.title} · Οι Συνταγές της Μαμάς`;

createRoot(document.getElementById("root")!).render(
  selected ? <RecipeView key={selected.id} recipe={selected} header={<Shell demo demoNotice={demoNotice}>{null}</Shell>} />
    : <Shell demo demoNotice={demoNotice}>
      {id ? <main id="main" className="container"><h1>Η συνταγή δεν βρέθηκε</h1><Link className="button primary" href="/">Αρχική</Link></main>
        : <Catalog recipes={recipes} query={query} view={view} category={category} searchAction={import.meta.env.BASE_URL} />}
    </Shell>,
);
