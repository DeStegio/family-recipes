import { describe, expect, it } from "vitest";
import { apple, loukoumades, sout } from "../../src/domain/fixtures";
import { evidenceErrors, matchesRecipe, publicationErrors, searchKey } from "../../src/domain/recipe";

describe("Greek search", () => {
  it.each(["μηλοπιτα", "ΜΗΛΟΠΙΤΑ", "Μηλόπιτα", "αλευρι μηλοπιτα"])("finds Μηλόπιτα with %s", (query) => {
    expect(matchesRecipe(apple, query)).toBe(true);
    expect(apple.title).toBe("Μηλόπιτα");
  });
  it("normalizes final sigma and Greek aliases", () => {
    expect(searchKey("Λουκουμάδες")).toBe("λουκουμαδεσ");
    expect(matchesRecipe(loukoumades, "λουκουμαδεσ")).toBe(true);
    expect(matchesRecipe(sout, "κεφτεδεσ")).toBe(true);
    expect(matchesRecipe(sout, "μηλοπιτα")).toBe(false);
  });
});

describe("Archive rules", () => {
  it("keeps conflicting quantities as source-specific quotes", () => {
    expect(evidenceErrors(sout)).toEqual([]);
    const swapped = structuredClone(sout);
    swapped.issues[0].evidence[1].sourceId = "sout-1";
    expect(evidenceErrors(swapped)).not.toHaveLength(0);
    expect(publicationErrors(sout, true)).toContain("Υπάρχουν ουσιώδεις εκκρεμότητες.");
  });
  it("requires human confirmation and verifies every referenced source", () => {
    expect(publicationErrors(apple, true)).toEqual([]);
    expect(publicationErrors(apple, false)).not.toHaveLength(0);
    const broken = structuredClone(apple);
    broken.steps[3].timeSourceId = "unrelated";
    expect(publicationErrors(broken, true)).toContain("Κάθε καταχωρισμένη τιμή πρέπει να συνδέεται με πηγή.");
  });
  it("does not infer a quantity or convert a household measure", () => {
    const item = structuredClone(apple);
    item.ingredients[0].text = "ένα ποτήρι νερό";
    item.ingredients[0].confirmed = false;
    expect(publicationErrors(item, true)).toContain("Υπάρχουν ανεπιβεβαίωτα υλικά.");
    expect(item.ingredients[0].text).toBe("ένα ποτήρι νερό");
  });
});
