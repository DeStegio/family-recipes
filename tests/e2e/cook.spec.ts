import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function fits(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => document.documentElement.clientWidth),
  );
}

for (const width of [1440, 390, 320]) {
  test(`Μηλόπιτα from search through the originals at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    await page.goto("/");
    await fits(page);
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Μετάβαση στο περιεχόμενο" })).toBeFocused();
    const input = page.getByRole("searchbox");
    await input.fill(width === 390 ? "ΜΗΛΟΠΙΤΑ" : "μηλοπιτα");
    await input.press("Enter");
    await expect(page.getByRole("heading", { name: /1 συνταγή για/ })).toBeVisible();
    await page.getByRole("link", { name: "Μηλόπιτα", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Μηλόπιτα", exact: true })).toBeVisible();
    await fits(page);
    const ingredient = page.getByRole("checkbox", { name: "3 μήλα", exact: true });
    await ingredient.check();
    const start = page.getByRole("button", { name: "Έναρξη μαγειρέματος" });
    const bounds = await start.boundingBox();
    expect(bounds?.height).toBeGreaterThanOrEqual(44);
    expect(bounds?.width).toBeGreaterThanOrEqual(44);
    await start.click();
    await expect(page.getByText("Βήμα 1 από 5")).toBeVisible();
    await page.getByRole("button", { name: "Επόμενο", exact: true }).click();
    await expect(page.getByText("Βήμα 2 από 5")).toBeVisible();
    await expect(page.getByRole("button", { name: "Έναρξη χρονομέτρου" })).toHaveCount(0);
    const sourceButton = page.getByRole("button", { name: "Δες το χειρόγραφο" });
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(sourceButton).toBeFocused();
    await expect(sourceButton).toHaveCSS("outline-style", "solid");
    await sourceButton.press("Enter");
    const viewer = page.getByRole("dialog");
    await expect(viewer.getByRole("heading", { name: "Πρωτότυπο 1 από 2" })).toBeVisible();
    await expect.poll(() => viewer.getByRole("img").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    await viewer.getByRole("button", { name: "Μεγέθυνση", exact: true }).click();
    await viewer.getByRole("button", { name: "Περιστροφή", exact: true }).click();
    await fits(page);
    expect(await viewer.evaluate((el) => el.scrollWidth)).toBeLessThanOrEqual(await viewer.evaluate((el) => el.clientWidth));
    await viewer.getByRole("button", { name: "Επόμενο", exact: true }).click();
    await viewer.getByRole("button", { name: "Μεταγραφή", exact: true }).click();
    await expect(viewer.getByText(/Φόρμα 22 εκ/)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(viewer).toHaveCount(0);
    await expect(sourceButton).toBeFocused();
    await expect(page.getByText("Βήμα 2 από 5")).toBeVisible();
    const a11y = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(a11y.violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath("cooking.png") });
    await page.getByRole("button", { name: "Επόμενο", exact: true }).click();
    await page.getByRole("button", { name: "Επόμενο", exact: true }).click();
    await expect(page.getByText("Βήμα 4 από 5")).toBeVisible();
    await page.getByRole("button", { name: "Έναρξη χρονομέτρου" }).click();
    await expect(page.getByRole("button", { name: "Παύση" })).toBeVisible();
    await page.getByRole("button", { name: "Επόμενο", exact: true }).click();
    await expect(page.getByText("Βήμα 5 από 5")).toBeVisible();
    await page.getByRole("button", { name: "Ολοκλήρωση" }).click();
    await expect(page.getByRole("heading", { name: "Καλή απόλαυση!" })).toBeVisible();
    await page.getByRole("button", { name: "Επιστροφή στη συνταγή" }).click();
    await expect(page.getByRole("checkbox", { name: "3 μήλα", exact: true })).toBeChecked();
  });
}

test("filters, empty search, and device favorites", async ({ page }) => {
  await page.goto("/?q=λουκουμαδεσ");
  await expect(page.getByRole("link", { name: "Λουκουμάδες", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Αγαπημένο · Λουκουμάδες" }).click();
  await page.getByRole("navigation", { name: "Κύρια πλοήγηση" }).getByRole("link", { name: "Αγαπημένα" }).click();
  await expect(page.getByRole("link", { name: "Λουκουμάδες", exact: true })).toBeVisible();
  await page.locator("#recipe-search").fill("μπριάμ");
  await page.locator("#recipe-search").press("Enter");
  await expect(page.getByRole("heading", { name: "Δεν βρέθηκε συνταγή" })).toBeVisible();
  await page.getByRole("link", { name: "Δες όλες τις συνταγές" }).click();
  await expect(page.getByRole("heading", { name: "Όλες οι συνταγές" })).toBeVisible();
  await page.getByRole("link", { name: "Κυρίως πιάτα", exact: true }).click();
  await expect(page.getByRole("link", { name: "Σουτζουκάκια", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Μηλόπιτα", exact: true })).toHaveCount(0);
});

test("home stays keyboard accessible at equivalent 200% viewport", async ({ page }) => {
  await page.setViewportSize({ width: 720, height: 500 });
  await page.goto("/");
  await fits(page);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
});
