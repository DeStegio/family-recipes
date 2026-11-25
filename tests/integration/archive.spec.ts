import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import type { Draft } from "../../src/domain/review";

const origin = "http://127.0.0.1:3133";
const password = "LocalRecipeSample2026!";
const example = "bb8cb31b-97f8-4ef6-83c4-0f3a7b832ecd";
const files = ["fixtures/images/sout-1.jpg", "fixtures/images/sout-2.jpg"];
const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

async function loginRequest(client: APIRequestContext, role: string) {
  const response = await client.post("/api/session/login", {
    form: { email: role + "@recipes.test", password }, headers: { Origin: origin }, maxRedirects: 0,
  });
  expect(response.status()).toBe(303);
  expect(response.headers().location).toBe(origin + "/");
  expect(response.headers()["set-cookie"]).toContain("HttpOnly");
}

async function importDraft(page: Page, title: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@recipes.test");
  await page.getByLabel("Κωδικός", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Σύνδεση" }).click();
  await page.getByRole("link", { name: "Προς έλεγχο" }).click();
  await page.getByRole("link", { name: "Προσθήκη συνταγής" }).click();
  await page.getByLabel("Τίτλος συνταγής").fill(title);
  await page.getByLabel("Έως 6 φωτογραφίες").setInputFiles(files);
  await page.getByLabel("Πιστή μεταγραφή · Πηγή 1").fill("Σουτζουκάκια\n500 γρ. κιμάς\n[δεν διαβάζεται]");
  await page.getByRole("button", { name: "Επόμενο", exact: true }).click();
  await page.getByLabel("Πιστή μεταγραφή · Πηγή 2").fill("Σουτζουκάκια\n750 γρ. κιμάς");
  await page.getByRole("button", { name: "Προσθήκη θέματος" }).click();
  await page.getByLabel("Είδος θέματος").selectOption("conflicting");
  await page.getByLabel("Πεδίο ή σημείωση").fill("Ποσότητα κιμά");
  await page.getByRole("button", { name: "Προσθήκη αποσπάσματος" }).click();
  await page.getByLabel("Αυτούσιο απόσπασμα 1").fill("500 γρ. κιμάς");
  await page.getByRole("button", { name: "Προσθήκη αποσπάσματος" }).click();
  await page.getByLabel("Αυτούσιο απόσπασμα 2").fill("750 γρ. κιμάς");
  await page.getByRole("button", { name: "Αποθήκευση προσχεδίου" }).click();
  await expect(page).toHaveURL(/\/review\/[a-z0-9-]+\?saved=draft/);
  await expect(page.getByText("Οι εκδοχές διαφωνούν · Ουσιώδες")).toBeVisible();
  await expect(page.getByText("500 γρ. κιμάς", { exact: true })).toBeVisible();
  await expect(page.getByText("750 γρ. κιμάς", { exact: true })).toBeVisible();
  return new URL(page.url()).pathname.split("/").at(-1)!;
}

test("an administrator imports conflicting originals and readers can only open published material", async ({ page, playwright, request }) => {
  expect((await request.get("/api/recipes")).status()).toBe(401);
  expect((await request.get("/api/fixtures/apple-1")).status()).toBe(404);
  const title = "Σουτζουκάκια ελέγχου " + randomUUID().slice(0, 8);
  const id = await importDraft(page, title);
  await page.getByLabel("Επιβεβαιώνω ότι έλεγξα").check();
  await page.getByRole("button", { name: "Δημοσίευση" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Υπάρχουν ουσιώδεις εκκρεμότητες");

  const admin = page.request;
  const loaded = await (await admin.get(`/api/review/${id}`)).json();
  const draft: Draft = loaded.draft;
  const firstSource = draft.sources[0].id;
  const reviewUrl = `/api/recipes/${id}/sources/${firstSource}?review=1`;
  const signed = await admin.get(reviewUrl, { maxRedirects: 0 });
  expect(signed.status()).toBe(307);
  expect(signed.headers()["cache-control"]).toContain("no-store");
  const signedUrl = new URL(signed.headers().location);
  expect(signedUrl.searchParams.get("X-Amz-Expires")).toBe("60");
  const unsignedUrl = new URL(signedUrl);
  unsignedUrl.search = "";
  expect((await request.get(unsignedUrl.toString())).status()).toBe(403);
  const original = await request.get(signedUrl.toString());
  expect(original.status()).toBe(200);
  expect(hash(await original.body())).toBe(hash(await readFile(files[0])));
  await page.getByRole("button", { name: "Άνοιγμα φωτογραφίας" }).click();
  const viewer = page.getByRole("dialog");
  const download = viewer.getByRole("link", { name: "Λήψη πρωτοτύπου" });
  await expect(download).toHaveAttribute("href", reviewUrl + "&download=1");
  const downloaded = await admin.get((await download.getAttribute("href"))!);
  expect(downloaded.status()).toBe(200);
  expect(downloaded.headers()["content-disposition"]).toBe(`attachment; filename="prototypo-${firstSource}.jpg"`);
  expect(hash(await downloaded.body())).toBe(hash(await readFile(files[0])));
  await viewer.getByRole("button", { name: "Κλείσιμο" }).click();

  const reader = await playwright.request.newContext({ baseURL: origin });
  try {
    await loginRequest(reader, "reader");
    expect((await reader.get("/api/recipes")).status()).toBe(200);
    const published = await reader.get("/api/recipes/" + example);
    expect(published.status()).toBe(200);
    const publishedSource = (await published.json()).sources[0].url;
    const restoredImage = await reader.get(publishedSource);
    expect(restoredImage.status()).toBe(200);
    expect(hash(await restoredImage.body())).toBe(hash(await readFile("fixtures/images/apple-1.jpg")));
    expect((await reader.get(publishedSource + "?download=1")).status()).toBe(403);
    expect((await reader.get("/api/recipes/" + id)).status()).toBe(404);
    expect((await reader.get("/api/review/" + id)).status()).toBe(403);
    expect((await reader.get(reviewUrl)).status()).toBe(403);
    expect((await reader.get(reviewUrl.split("?")[0])).status()).toBe(404);
    expect((await reader.post("/api/recipes", { headers: { Origin: origin } })).status()).toBe(403);
    const listing = await (await reader.get("/")).text();
    expect(listing).not.toContain("Προς έλεγχο");
    expect((await reader.post("/api/session/logout", { headers: { Origin: origin }, maxRedirects: 0 })).status()).toBe(303);
    expect((await reader.get("/api/recipes")).status()).toBe(401);
  } finally { await reader.dispose(); }

  const save = { type: "save", revision: loaded.revision, draft };
  expect((await admin.post(`/api/review/${id}`, { data: save, headers: { Origin: "https://elsewhere.example" } })).status()).toBe(403);
  const truncated = { ...save, draft: { ...draft, sources: draft.sources.slice(0, 1), issues: [] } };
  expect((await admin.post(`/api/review/${id}`, { data: truncated, headers: { Origin: origin } })).status()).toBe(400);
  expect((await admin.post(`/api/review/${id}`, { data: save, headers: { Origin: origin } })).status()).toBe(200);
  expect((await admin.post(`/api/review/${id}`, { data: save, headers: { Origin: origin } })).status()).toBe(409);
  const after = await (await admin.get(`/api/review/${id}`)).json();
  expect(after.draft.sources).toEqual(draft.sources);
  expect(after.history.map((entry: { action: string }) => entry.action)).toEqual(["save", "import"]);
});

test("linking a duplicate preserves previous publications and both photos", async ({ playwright }) => {
  const owner = await playwright.request.newContext({ baseURL: origin });
  try {
    await loginRequest(owner, "owner");
    const recipeId = randomUUID();
    const sourceId = randomUUID();
    const draft: Draft = {
      title: "Μηλόπιτα", category: "sweets", aliases: [], sources: [{ id: sourceId, transcription: "Νέα πηγή για τη μηλόπιτα" }],
      ingredients: [], steps: [], issues: [],
    };
    const photo = { name: "image.jpg", mimeType: "image/jpeg", buffer: await readFile(files[0]) };
    const multipart = { id: recipeId, draft: JSON.stringify(draft), photos: photo };
    expect((await owner.post("/api/recipes", { headers: { Origin: origin }, multipart })).status()).toBe(201);
    expect((await owner.post("/api/recipes", { headers: { Origin: origin }, multipart })).status()).toBe(201);
    const oldPublished = await (await owner.get("/api/recipes/" + example)).json();
    const loaded = await (await owner.get("/api/review/" + recipeId)).json();
    expect(loaded.duplicates.some((item: { id: string }) => item.id === example)).toBe(true);
    const result = await owner.post("/api/review/" + recipeId, { headers: { Origin: origin }, data: {
      type: "link", revision: loaded.revision, target: example, draft: loaded.draft,
    } });
    expect(result.status()).toBe(200);
    const destination = await (await owner.get("/api/review/" + example)).json();
    expect(destination.draft.sources.some((item: { id: string }) => item.id === loaded.draft.sources[0].id)).toBe(true);
    expect((await (await owner.get("/api/recipes/" + example)).json()).sources).toEqual(oldPublished.sources);
    const linked = await (await owner.get("/api/review/" + recipeId)).json();
    expect(linked.draft.sources).toEqual(loaded.draft.sources);
    expect(linked.history[0].action).toBe("link:" + example);
  } finally { await owner.dispose(); }
});
