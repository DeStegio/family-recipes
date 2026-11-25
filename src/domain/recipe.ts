export const categories = { sweets: "Γλυκά", mains: "Κυρίως πιάτα", pies: "Πίτες", starters: "Ορεκτικά", festive: "Γιορτινά" } as const;
export type Category = keyof typeof categories;

export const issueLabels = {
  unreadable: "Δεν διαβάζεται",
  missing: "Λείπει από τη φωτογραφία ή το χειρόγραφο",
  conflicting: "Οι εκδοχές διαφωνούν",
  uncertain: "Χρειάζεται επιβεβαίωση",
} as const;

export type Source = { id: string; transcription: string; description?: string; url: string };
export type Ingredient = { id: string; text: string; sourceId: string; confirmed: boolean };
export type Step = { title: string; text: string; sourceId: string; ingredientIds: string[]; minutes?: number; timeSourceId?: string };
export type Issue = {
  id: string;
  kind: keyof typeof issueLabels;
  text: string;
  essential: boolean;
  evidence: { sourceId: string; quote: string }[];
  resolution?: { text: string; sourceId: string };
};
export type Recipe = {
  id: string; title: string; category: Category; aliases: string[]; note?: string;
  servings?: { text: string; sourceId: string }; total?: { minutes: number; sourceId: string };
  sample?: boolean; archiveOnly?: boolean; sources: Source[]; ingredients: Ingredient[]; steps: Step[]; issues: Issue[];
};

export function searchKey(text: string) {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("el").replaceAll("ς", "σ").trim();
}

export function matchesRecipe(recipe: Recipe, query: string) {
  const haystack = searchKey([recipe.title, ...recipe.aliases, categories[recipe.category], recipe.note,
    ...recipe.ingredients.filter((ingredient) => ingredient.confirmed).map((ingredient) => ingredient.text),
    ...recipe.steps.map((step) => step.text)].join(" "));
  return searchKey(query).split(/\s+/).every((word) => haystack.includes(word));
}

export function publicationErrors(recipe: Recipe, humanConfirmed: boolean) {
  const sources = new Map(recipe.sources.map((source) => [source.id, source]));
  const ingredients = new Set(recipe.ingredients.map((ingredient) => ingredient.id));
  const errors: string[] = [];
  if (!humanConfirmed) errors.push("Χρειάζεται ανθρώπινη επιβεβαίωση.");
  if (!sources.size || recipe.sources.some((source) => !source.transcription.trim())) errors.push("Χρειάζεται πιστή μεταγραφή για κάθε πηγή.");
  if (!recipe.ingredients.length || !recipe.steps.length) errors.push("Χρειάζονται υλικά και βήματα εκτέλεσης.");
  if (recipe.issues.some((issue) => issue.essential && !issue.resolution)) errors.push("Υπάρχουν ουσιώδεις εκκρεμότητες.");
  if (recipe.ingredients.some((item) => !item.confirmed)) errors.push("Υπάρχουν ανεπιβεβαίωτα υλικά.");
  if (ingredients.size !== recipe.ingredients.length) errors.push("Κάθε υλικό πρέπει να υπάρχει μία φορά στη δομημένη λίστα.");
  if (recipe.steps.some((step) => step.ingredientIds.some((id) => !ingredients.has(id)))) errors.push("Κάποιο βήμα αναφέρεται σε άγνωστο υλικό.");
  const refs = [
    ...recipe.ingredients.map((item) => item.sourceId),
    ...recipe.steps.flatMap((step) => step.minutes === undefined ? [step.sourceId] : [step.sourceId, step.timeSourceId]),
    ...(recipe.servings ? [recipe.servings.sourceId] : []),
    ...(recipe.total ? [recipe.total.sourceId] : []),
    ...recipe.issues.flatMap((issue) => issue.resolution ? [issue.resolution.sourceId] : []),
  ];
  if (refs.some((id) => !id || !sources.has(id))) errors.push("Κάθε καταχωρισμένη τιμή πρέπει να συνδέεται με πηγή.");
  return errors;
}

export function evidenceErrors(recipe: Recipe) {
  const sources = new Map(recipe.sources.map((source) => [source.id, source.transcription]));
  return recipe.issues.flatMap((issue) => {
    if (issue.kind === "conflicting" && new Set(issue.evidence.map((item) => item.sourceId)).size < 2) {
      return ["Η διαφωνία χρειάζεται αποσπάσματα από τουλάχιστον δύο διαφορετικές πηγές."];
    }
    if (issue.evidence.some((item) => !sources.get(item.sourceId)?.includes(item.quote))) {
      return ["Κάθε απόσπασμα πρέπει να υπάρχει αυτούσιο στη μεταγραφή της πηγής του."];
    }
    return [];
  });
}
