import type { Recipe, Source } from "./recipe";

const source = (id: string, transcription: string): Source => ({
  id, transcription, url: "/api/fixtures/" + id, description: "Ενδεικτική εικόνα από το σχέδιο.",
});

const ingredients = [
  ["3 μήλα", "apple-1"], ["200 γρ. αλεύρι", "apple-1"], ["150 γρ. ζάχαρη", "apple-1"],
  ["100 γρ. βούτυρο", "apple-1"], ["2 αυγά", "apple-1"],
  ["8 γρ. μπέικιν πάουντερ", "apple-1"], ["1 κ.γ. κανέλα", "apple-1"],
].map(([text, sourceId], index) => ({ id: String(index + 1), text, sourceId, confirmed: true }));

export const apple: Recipe = {
  id: "milopita", title: "Μηλόπιτα", category: "sweets", aliases: [], sample: true,
  note: "Απλή, αρωματική και γραμμένη για να τη μοιραζόμαστε.",
  sources: [
    source("apple-1", "Μηλόπιτα\n3 μήλα\n200 γρ αλεύρι\n150 γρ ζάχαρη\n100 γρ βούτυρο\n2 αυγά\n8 γρ μπέικιν πάουντερ\n1 κ.γ. κανέλα\n\n180°C, ψήσιμο 45 λεπτά,\nξεκούραση 15 λεπτά"),
    source("apple-2", "Μηλόπιτα — εκτέλεση\n1. Προθέρμανε στους 180°C. Κόψε 3 μήλα.\n2. Χτύπα 2 αυγά, 150 γρ. ζάχαρη, 100 γρ. βούτυρο.\n3. Βάλε 200 γρ. αλεύρι, 8 γρ. μπέικιν, 1 κ.γ. κανέλα και τα μήλα.\n4. Φόρμα 22 εκ., ψήσιμο 45 λεπτά.\n5. Περίμενε 15 λεπτά."),
  ],
  ingredients,
  steps: [
    { title: "Προετοίμασε τα μήλα", text: "Προθέρμανε τον φούρνο στους 180°C. Καθάρισε 3 μήλα και κόψε τα σε μικρά κομμάτια.", ingredientIds: ["1"] },
    { title: "Ανάμειξε τα υγρά", text: "Χτύπησε 2 αυγά με 150 γρ. ζάχαρη. Πρόσθεσε 100 γρ. βούτυρο και ανακάτεψε.", ingredientIds: ["5", "3", "4"] },
    { title: "Ένωσε το μείγμα", text: "Πρόσθεσε 200 γρ. αλεύρι, 8 γρ. μπέικιν πάουντερ και 1 κ.γ. κανέλα. Ανακάτεψε απαλά και πρόσθεσε τα 3 κομμένα μήλα.", ingredientIds: ["2", "6", "7", "1"] },
    { title: "Ψήσε τη μηλόπιτα", text: "Βάλε το μείγμα σε φόρμα 22 εκ. και ψήσε για 45 λεπτά.", ingredientIds: [], minutes: 45, timeSourceId: "apple-2" },
    { title: "Άφησέ τη να κρυώσει", text: "Περίμενε 15 λεπτά πριν κόψεις τη μηλόπιτα.", ingredientIds: [], minutes: 15, timeSourceId: "apple-2" },
  ].map((step) => ({ ...step, sourceId: "apple-2" })),
  issues: [],
};

export const sout: Recipe = {
  id: "soutzoukakia", title: "Σουτζουκάκια", category: "mains", aliases: ["Κεφτέδες"], sample: true, archiveOnly: true,
  note: "Η ποσότητα του κιμά διαφέρει στις δύο πηγές. Η εκτέλεση παραμένει ελλιπής.",
  sources: [
    source("sout-1", "Σουτζουκάκια\n500 γρ. κιμάς\n2 φέτες ψωμί\n1 αυγό\nκύμινο\nσάλτσα ντομάτας\n[δεν διαβάζεται]"),
    source("sout-2", "Σουτζουκάκια\n750 γρ. κιμάς\n2 φέτες ψωμί\n1 αυγό\nκύμινο\nσάλτσα ντομάτας\n[δεν διαβάζεται]"),
  ],
  ingredients: [], steps: [],
  issues: [
    { id: "conflict", kind: "conflicting", text: "Ποσότητα κιμά", essential: true,
      evidence: [{ sourceId: "sout-1", quote: "500 γρ. κιμάς" }, { sourceId: "sout-2", quote: "750 γρ. κιμάς" }] },
    { id: "unreadable", kind: "unreadable", text: "Η σημείωση μετά τη σάλτσα.", essential: false, evidence: [{ sourceId: "sout-1", quote: "[δεν διαβάζεται]" }] },
    { id: "missing", kind: "missing", text: "Η εκτέλεση της συνταγής.", essential: true, evidence: [] },
  ],
};

export const loukoumades: Recipe = {
  id: "loukoumades", title: "Λουκουμάδες", category: "sweets", aliases: [], sample: true, archiveOnly: true,
  note: "Δοκιμαστική καταχώριση για την αναζήτηση.",
  sources: [], ingredients: [], steps: [], issues: [],
};

export const demoRecipes = [apple, sout, loukoumades];
