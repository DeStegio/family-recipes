import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { expect, test, type APIRequestContext } from "@playwright/test";
import type { Draft } from "../../src/domain/review";

const origin = "http://127.0.0.1:3133";
const password = "LocalRecipeSample2026!";
const headers = { Origin: origin };

async function login(client: APIRequestContext, email: string) {
  const response = await client.post("/api/session/login", { form: { email, password }, headers, maxRedirects: 0 });
  expect(response.status()).toBe(303);
  expect(response.headers().location).toBe(origin + "/");
}

test("the owner provisions a reader and a confirmed recipe becomes available", async ({ playwright }) => {
  const owner = await playwright.request.newContext({ baseURL: origin });
  const admin = await playwright.request.newContext({ baseURL: origin });
  const reader = await playwright.request.newContext({ baseURL: origin });
  try {
    await login(owner, "owner@recipes.test");
    await login(admin, "admin@recipes.test");
    const email = randomUUID() + "@recipes.test";
    const account = { form: { email, password, role: "reader" }, headers, maxRedirects: 0 };
    expect((await admin.post("/api/accounts", account)).status()).toBe(403);
    expect((await owner.post("/api/accounts", account)).headers().location).toBe(origin + "/review/accounts?status=created");
    await login(reader, email);

    const id = randomUUID();
    const source = randomUUID();
    const recipe: Draft = {
      title: "Δείγμα δημοσίευσης " + id,
      category: "starters", aliases: [], sources: [{ id: source, transcription: "ένα ποτήρι νερό\nΡίξε το νερό στο μπολ." }],
      ingredients: [{ id: randomUUID(), text: "ένα ποτήρι νερό", sourceId: source, confirmed: true }],
      steps: [{ title: "Βάλε το νερό", text: "Ρίξε το νερό στο μπολ.", sourceId: source, ingredientIds: [] }],
      issues: [],
    };
    const multipart = { id, draft: JSON.stringify(recipe), photos: { name: "sample.png", mimeType: "image/png", buffer: await readFile("fixtures/images/apple-1.png") } };
    expect((await admin.post("/api/recipes", { multipart, headers })).status()).toBe(201);
    expect((await reader.get("/api/recipes/" + id)).status()).toBe(404);
    const loaded = await (await admin.get("/api/review/" + id)).json();
    const submit = (humanConfirmed: boolean) => admin.post("/api/review/" + id, {
      data: { revision: loaded.revision, type: "publish", draft: loaded.draft, humanConfirmed }, headers,
    });
    expect((await submit(false)).status()).toBe(422);
    if (loaded.duplicates.length) {
      const decided = await admin.post("/api/review/" + id, { data: { revision: loaded.revision, type: "new", draft: loaded.draft }, headers });
      expect(decided.status()).toBe(200);
      loaded.revision++;
    }
    expect((await submit(true)).status()).toBe(200);
    const published = await (await reader.get("/api/recipes/" + id)).json();
    expect(published.ingredients[0].text).toBe("ένα ποτήρι νερό");
    expect(published.ingredients[0].sourceId).toBe(published.sources[0].id);
    expect((await reader.get(published.sources[0].url)).status()).toBe(200);
  } finally {
    await Promise.all([owner.dispose(), admin.dispose(), reader.dispose()]);
  }
});
