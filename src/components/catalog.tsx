"use client";

import Link from "next/link";
import { categories, matchesRecipe, type Category, type Recipe } from "@/domain/recipe";
import { Favorite, useFavorites } from "./favorites";

export function Catalog({ recipes, query, view, category, searchAction = "/" }: {
  recipes: Recipe[]; query: string; view: string; category?: Category; searchAction?: string;
}) {
  const favorites = useFavorites();
  const home = !query && view === "home" && !category;
  const filtered = recipes.filter((recipe) => (!category || recipe.category === category)
    && (view !== "favorites" || favorites.includes(recipe.id)) && matchesRecipe(recipe, query));
  const title = query ? "Τι θέλεις να μαγειρέψεις;" : category ? categories[category]
    : view === "favorites" ? "Αγαπημένα" : home ? "Τι θέλεις να μαγειρέψεις;" : "Όλες οι συνταγές";

  return <main id="main" className="container catalog">
    {home && <p className="eyebrow">Το δικό μας τετράδιο</p>}
    <h1>{title}</h1>
    <form action={searchAction} className="search" role="search">
      <label htmlFor="recipe-search" className="sr-only">Αναζήτηση συνταγών</label>
      <input id="recipe-search" name="q" type="search" defaultValue={query} placeholder="Γράψε μια συνταγή ή ένα υλικό…" maxLength={160} />
      <button className="primary">Αναζήτηση</button>
    </form>
    <nav className="categories" aria-label="Κατηγορίες συνταγών">
      <Link className="button" href="/?view=all" aria-current={view === "all" && !category && !query ? "page" : undefined}>Όλες οι συνταγές</Link>
      {Object.entries(categories).filter(([key]) => recipes.some((recipe) => recipe.category === key))
        .map(([key, name]) => <Link className="button" aria-current={category === key ? "page" : undefined} key={key} href={`/?category=${key}`}>{name}</Link>)}
      <Link className="button mobile-favorites" href="/?view=favorites" aria-current={view === "favorites" ? "page" : undefined}>Αγαπημένα</Link>
    </nav>
    {home && <div className="intro"><h2>Οι γεύσεις που θυμόμαστε.<br className="desktop-link" /> Τα γραμμένα που κρατάμε.</h2>
      <p>Κάθε χειρόγραφο βρίσκει τη θέση του. Κάθε συνταγή γίνεται πιο εύκολη στο μαγείρεμα.</p>
    </div>}
    {query && <h2>{filtered.length ? `${filtered.length} ${filtered.length === 1 ? "συνταγή" : "συνταγές"} για «${query}»` : "Δεν βρέθηκε συνταγή"}</h2>}
    {home && <h2>Από το τετράδιο</h2>}
    {filtered.length ? <ul className="recipe-grid">{filtered.map((recipe) => <li className="recipe-card" key={recipe.id}>
      <div className="card-top"><span className="eyebrow">{categories[recipe.category]}</span><Favorite id={recipe.id} title={recipe.title} /></div>
      <h3><Link href={`/recipes/${recipe.id}`}>{recipe.title}</Link></h3>
      {recipe.total && <p>{recipe.total.minutes} λεπτά{recipe.servings && ` · ${recipe.servings.text}`}</p>}
      {recipe.archiveOnly && recipe.sources.length > 0 && <p>{recipe.sources.length} πρωτότυπα · Προς έλεγχο</p>}
      {recipe.note && <p>{recipe.note}</p>}
      <Link className="text-link" aria-label={`Δες τη συνταγή · ${recipe.title}`} href={`/recipes/${recipe.id}`}>Δες τη συνταγή</Link>
    </li>)}</ul> : <div className="empty">
      <p>{query ? `Δοκίμασε άλλη λέξη ή υλικό αντί για «${query}».` : view === "favorites" ? "Πάτησε την καρδιά σε μια συνταγή για να τη βρεις εδώ." : "Η συλλογή δεν έχει ακόμη συνταγές σε αυτή την κατηγορία."}</p>
      <Link className="button primary" href="/?view=all">Δες όλες τις συνταγές</Link>
    </div>}
  </main>;
}
