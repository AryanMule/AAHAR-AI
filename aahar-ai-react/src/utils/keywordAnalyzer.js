const ALLERGEN_DB = {
  Milk: ["milk", "lactose", "butter"],
  Eggs: ["egg", "albumin"],
  Peanuts: ["peanut", "groundnut"],
};

export function analyzeWithKeywords(text, profile) {
  const lower = text.toLowerCase();

  const allergens = [];

  for (const [name, keywords] of Object.entries(ALLERGEN_DB)) {
    const matches = keywords.filter((k) => lower.includes(k));

    if (matches.length > 0) {
      allergens.push({
        name,
        risk: "definite",
        triggers: matches,
        explanation: `Found: ${matches.join(", ")}`,
      });
    }
  }

  return {
    summary:
      allergens.length > 0
        ? "Allergens detected"
        : "No allergens found",
    allergens,
  };
}