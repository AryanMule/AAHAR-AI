// ============================================================
// AAHAR-AI — Allergen Mapping Engine
// DB lookup + AI fallback for mapping ingredients to allergens
// ============================================================
const { getDb } = require('../db/db');

// Gemini API URL builder
function getGeminiUrl(apiKey) {
    return `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
}

/**
 * Map ingredients to allergens using:
 * 1. Database keyword matching
 * 2. Database ingredient_allergens table
 * 3. Gemini AI fallback for unknowns
 *
 * @param {string[]} ingredients - normalized ingredient list
 * @param {string} apiKey - Gemini API key (optional, for AI fallback)
 * @returns {Promise<Object[]>} - allergen results
 */
async function mapAllergens(ingredients, apiKey) {
    const db = getDb();
    const results = [];
    const unmapped = [];

    // Load all allergens with keywords
    const allergens = db.prepare('SELECT * FROM allergens').all();

    for (const ingredient of ingredients) {
        const normalized = ingredient.toLowerCase().trim();
        let matched = false;

        // Strategy 1: Check ingredient_allergens DB table
        const dbMapping = db.prepare(`
            SELECT ia.*, a.name as allergen_name, a.icon
            FROM ingredient_allergens ia
            JOIN ingredients i ON ia.ingredient_id = i.id
            JOIN allergens a ON ia.allergen_id = a.id
            WHERE i.normalized_name = ?
        `).all(normalized);

        if (dbMapping.length > 0) {
            for (const m of dbMapping) {
                results.push({
                    ingredient: ingredient,
                    allergen: m.allergen_name,
                    icon: m.icon,
                    confidence: m.confidence_score,
                    risk: m.risk_level,
                    source: 'database'
                });
            }
            matched = true;
        }

        // Strategy 2: Keyword matching against allergen keywords
        if (!matched) {
            for (const allergen of allergens) {
                const keywords = JSON.parse(allergen.keywords || '[]');
                for (const kw of keywords) {
                    if (normalized.includes(kw) || kw.includes(normalized)) {
                        results.push({
                            ingredient: ingredient,
                            allergen: allergen.name,
                            icon: allergen.icon,
                            confidence: 0.7,
                            risk: 'likely',
                            source: 'keyword'
                        });
                        matched = true;
                        break;
                    }
                }
                if (matched) break;
            }
        }

        if (!matched) {
            unmapped.push(ingredient);
        }
    }

    // Strategy 3: AI fallback for unmapped ingredients
    if (unmapped.length > 0 && apiKey) {
        try {
            const aiResults = await geminiAllergenFallback(unmapped, apiKey);
            results.push(...aiResults);
        } catch (err) {
            console.warn('AI fallback failed:', err.message);
        }
    }

    return results;
}

/**
 * Use Gemini AI to classify unmapped ingredients
 */
async function geminiAllergenFallback(ingredients, apiKey) {
    const prompt = `As a food allergen expert, analyze these ingredients and identify any allergen associations.
Ingredients: ${ingredients.join(', ')}

For each ingredient that may be or contain an allergen, respond with JSON array:
[{"ingredient": "name", "allergen": "Big 9 allergen name or Other", "confidence": 0.0-1.0, "risk": "definite|likely|possible", "explanation": "brief reason"}]

If an ingredient has NO allergen association, don't include it.
Respond ONLY with the JSON array, no markdown.`;

    const response = await fetch(getGeminiUrl(apiKey), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
        })
    });

    if (!response.ok) return [];

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return [];

    const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return (Array.isArray(parsed) ? parsed : []).map(r => ({
        ingredient: r.ingredient,
        allergen: r.allergen,
        icon: '🤖',
        confidence: r.confidence || 0.5,
        risk: r.risk || 'possible',
        source: 'ai'
    }));
}

module.exports = { mapAllergens };
