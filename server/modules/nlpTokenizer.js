// ============================================================
// AAHAR-AI — NLP Tokenizer Module
// Ingredient string → normalized tokens
// ============================================================

/**
 * Tokenize and normalize a raw ingredient string into individual ingredient names.
 * Handles:
 * - Comma/semicolon-separated lists
 * - Parenthesized sub-ingredients (e.g., "bread (flour, water, yeast)")
 * - Percentage values (e.g., "sugar 15%")
 * - Common OCR noise cleanup
 * @param {string} rawText - raw ingredient text
 * @returns {string[]} - array of normalized ingredient names
 */
function tokenizeIngredients(rawText) {
    if (!rawText || typeof rawText !== 'string') return [];

    let text = rawText;

    // Clean up common OCR artifacts
    text = text.replace(/[|]/g, 'l');                   // pipe → l
    text = text.replace(/[{}]/g, '');                    // remove braces
    text = text.replace(/\n+/g, ', ');                   // newlines → commas
    text = text.replace(/\s+/g, ' ');                    // collapse whitespace
    text = text.replace(/ingredients?\s*[:;]/gi, '');    // remove "Ingredients:" prefix
    text = text.replace(/contains?\s*[:;]/gi, '');       // remove "Contains:" prefix
    text = text.replace(/may contain\s*[:;]?/gi, '');    // remove "May contain:"

    // Remove parenthesized sub-ingredients but keep the main ingredient
    // "Bread (wheat flour, water, yeast)" → "Bread, wheat flour, water, yeast"
    text = text.replace(/\(([^)]+)\)/g, ', $1');

    // Split on commas, semicolons, "and", periods
    const tokens = text.split(/[,;.]|\band\b/gi);

    // Normalize each token
    const ingredients = tokens
        .map(t => t.trim())
        .map(t => t.replace(/\d+(\.\d+)?%/g, '').trim())   // remove percentages
        .map(t => t.replace(/^\d+\.\s*/, '').trim())        // remove leading numbers
        .map(t => t.replace(/[*#†‡]/g, '').trim())          // remove marker symbols
        .filter(t => t.length >= 2)                          // minimum length
        .filter(t => !/^\d+$/.test(t))                       // not just numbers
        .map(t => t.toLowerCase());                          // lowercase

    // Deduplicate
    return [...new Set(ingredients)];
}

module.exports = { tokenizeIngredients };
