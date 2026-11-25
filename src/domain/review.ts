import { z } from "zod";
import { searchKey, type Recipe } from "./recipe";

const text = (max: number) => z.string().trim().min(1).max(max);
const id = z.uuid();
const source = z.object({ id, transcription: z.string().max(30000), description: z.string().max(300).optional() });
const duration = z.number().int().min(1).max(1440);

export const draftSchema = z.object({
  title: text(150), category: z.enum(["sweets", "mains", "pies", "starters", "festive"]),
  aliases: z.array(text(150)).max(20), note: z.string().max(3000).optional(),
  servings: z.object({ text: text(80), sourceId: id }).optional(),
  total: z.object({ minutes: duration, sourceId: id }).optional(),
  sources: z.array(source).min(1).max(60),
  ingredients: z.array(z.object({ id, text: text(300), sourceId: id, confirmed: z.boolean() })).max(100),
  steps: z.array(z.object({ title: text(150), text: text(3000), sourceId: id, ingredientIds: z.array(id).max(100),
    minutes: duration.optional(), timeSourceId: id.optional() })).max(100),
  issues: z.array(z.object({
    id, kind: z.enum(["unreadable", "missing", "conflicting", "uncertain"]), text: text(1000), essential: z.boolean(),
    evidence: z.array(z.object({ sourceId: id, quote: text(1000) })).max(30),
    resolution: z.object({ text: text(1000), sourceId: id }).optional(),
  })).max(100),
});
export type Draft = z.infer<typeof draftSchema>;
export const decisionSchema = z.object({
  revision: z.number().int().positive(),
  type: z.enum(["save", "publish", "link", "variant", "new"]),
  target: id.optional(),
  humanConfirmed: z.boolean().optional(),
  draft: draftSchema,
});

function tokens(value: string) {
  return new Set(searchKey(value).match(/\p{L}+/gu) ?? []);
}

function overlap(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return null;
  return [...a].filter((part) => b.has(part)).length / new Set([...a, ...b]).size;
}

function ratios(recipe: Pick<Recipe, "ingredients">) {
  const groups = new Map<string, { name: string; quantity: number }[]>();
  for (const ingredient of recipe.ingredients) {
    if (!ingredient.confirmed) continue;
    const match = searchKey(ingredient.text).match(/^(\d+(?:[,.]\d+)?)\s+(γρ\.?|κιλ[αό]|ml|g|kg|l)?\s*(\p{L}.*)$/u);
    if (!match) continue;
    const [, number, unit, name] = match;
    const normalized = unit?.replace(".", "") ?? "τεμάχια";
    const group = normalized === "γρ" || normalized === "g" || normalized === "κιλα" || normalized === "κιλο" || normalized === "kg" ? "mass"
      : normalized === "l" || normalized === "ml" ? "volume" : normalized;
    const quantity = Number(number.replace(",", ".")) * (["κιλα", "κιλο", "kg", "l"].includes(normalized) ? 1000 : 1);
    groups.set(group, [...(groups.get(group) ?? []), { name, quantity }]);
  }
  return new Map([...groups].filter(([, group]) => group.length > 1).flatMap(([unit, group]) => {
    const total = group.reduce((sum, item) => sum + item.quantity, 0);
    return total ? group.map((item) => [unit + ":" + item.name, item.quantity / total] as const) : [];
  }));
}

export function compareRecipes(a: Draft, b: Draft) {
  const title = Math.max(...[a.title, ...a.aliases].flatMap((left) => [b.title, ...b.aliases].map((right) => overlap(tokens(left), tokens(right)) ?? 0)));
  const ingredients = overlap(tokens(a.ingredients.map((item) => item.text).join(" ")), tokens(b.ingredients.map((item) => item.text).join(" ")));
  const steps = overlap(tokens(a.steps.map((item) => item.text).join(" ")), tokens(b.steps.map((item) => item.text).join(" ")));
  const left = ratios(a);
  const right = ratios(b);
  const common = [...left].filter(([key]) => right.has(key));
  const proportions = common.length >= 2
    ? common.reduce((sum, [key, value]) => sum + 1 - Math.abs(value - right.get(key)!), 0) / common.length
    : null;
  const score = .55 * title + .22 * (ingredients ?? 0) + .13 * (steps ?? 0) + .10 * (proportions ?? 0);
  return { title, ingredients, steps, proportions, score };
}
