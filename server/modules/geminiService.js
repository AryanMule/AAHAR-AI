// ============================================================
// AAHAR-AI — Server-side Gemini Service
// Handles all Gemini API calls from the backend
// ============================================================

const GEMINI_MODEL = 'gemini-2.0-flash';

function getGeminiUrl(apiKey) {
    return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
}

/**
 * Analyze ingredient text with Gemini — full nutrition + allergen pipeline
 * @param {string} ingredientText - raw ingredient text
 * @param {Object} userProfile - { name, allergies, sensitivityLevel, dietPreferences, medicalConditions, customAllergens }
 * @param {string} apiKey - Gemini API key
 * @returns {Promise<Object>} - analysis JSON
 */
async function analyzeIngredientsWithGemini(ingredientText, userProfile, apiKey) {
    const profileContext = buildProfileContext(userProfile);
    const userName = userProfile.name || 'the user';

    const prompt = buildAnalysisPrompt(ingredientText, profileContext, userName);

    const response = await fetch(getGeminiUrl(apiKey), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 4096 }
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`Gemini API error: ${response.status} - ${JSON.stringify(err)}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Empty Gemini response');

    const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const analysis = JSON.parse(cleaned);
    analysis._source = 'gemini';
    return analysis;
}

/**
 * Analyze a product image with Gemini Vision
 * @param {Buffer} imageBuffer - image data
 * @param {string} mimeType - image MIME type
 * @param {Object} userProfile - user profile
 * @param {string} apiKey - Gemini API key
 * @returns {Promise<Object>} - analysis JSON
 */
async function analyzeProductImageWithGemini(imageBuffer, mimeType, userProfile, apiKey) {
    const profileContext = buildProfileContext(userProfile);
    const userName = userProfile.name || 'the user';

    const base64Data = imageBuffer.toString('base64');

    const prompt = buildProductImagePrompt(profileContext, userName);

    const response = await fetch(getGeminiUrl(apiKey), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: mimeType || 'image/png', data: base64Data } }
                ]
            }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 4096 }
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`Gemini Vision API error: ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Empty Gemini Vision response');

    const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const analysis = JSON.parse(cleaned);
    analysis._source = 'gemini-vision';
    return analysis;
}

// ── Prompt Builders ────────────────────────────────────────

function buildProfileContext(profile) {
    const lines = [];
    lines.push(`Name: ${profile.name || 'Unknown'}`);

    if (profile.allergies && profile.allergies.length > 0) {
        lines.push(`Known Allergies: ${profile.allergies.map(a => `${a.allergen || a.name} (${a.severity || 'medium'})`).join(', ')}`);
    } else {
        lines.push('Known Allergies: None configured');
    }

    if (profile.sensitivityLevel) lines.push(`Sensitivity Level: ${profile.sensitivityLevel}`);
    if (profile.dietPreferences && profile.dietPreferences.length > 0) {
        lines.push(`Dietary Preferences: ${profile.dietPreferences.join(', ')}`);
    }
    if (profile.medicalConditions && profile.medicalConditions.length > 0) {
        lines.push(`Medical Conditions: ${profile.medicalConditions.join(', ')}`);
    }
    if (profile.customAllergens && profile.customAllergens.length > 0) {
        lines.push(`Custom Allergens: ${profile.customAllergens.join(', ')}`);
    }

    return lines.join('\n');
}

function buildAnalysisPrompt(ingredientText, profileContext, userName) {
    return `You are AAHAR-AI, a specialized food allergen detection, nutrition analysis, and health safety expert fine-tuned for personalized dietary analysis. You have deep knowledge of:
- All major food allergens (Big 9 and beyond)
- Hidden allergen derivatives and cross-contamination risks
- Medical dietary restrictions (celiac, diabetes, hypertension, etc.)
- Cultural/religious dietary laws (halal, kosher, etc.)
- Indian and global food ingredient terminology
- Food additives, preservatives, E-numbers, and their health impacts
- Nutritional analysis and health scoring

═══ USER HEALTH PROFILE ═══
${profileContext}

═══ INGREDIENT TEXT TO ANALYZE ═══
"${ingredientText}"

═══ YOUR TASK ═══
Analyze these ingredients SPECIFICALLY for ${userName}'s profile above. Perform BOTH allergen analysis AND nutrition intelligence.

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "productSummary": "Brief 1-line description of what this product likely is",
  "personalizedSummary": "2-3 line PERSONALIZED summary for ${userName}. Reference their SPECIFIC allergies, conditions. Be warm and direct.",
  "allergens": [
    {
      "name": "Allergen Name",
      "risk": "definite|likely|possible",
      "triggers": ["ingredient1", "ingredient2"],
      "explanation": "Why flagged, personalized",
      "personalNote": "Direct advice for this user"
    }
  ],
  "safeFor": ["allergens NOT found"],
  "dietaryFlags": ["violations of user's dietary restrictions"],
  "healthWarnings": ["warnings specific to user's health conditions"],
  "summary": "2-3 sentence allergen + nutrition summary",
  "nutrition_analysis": {
    "calories": { "level": "low|moderate|high", "category": "GOOD|MODERATE|RISK", "value": "estimated kcal per serving or N/A" },
    "sugar": { "level": "low|moderate|high", "category": "GOOD|MODERATE|RISK", "detail": "types of sugar found" },
    "fat": { "level": "low|moderate|high", "category": "GOOD|MODERATE|RISK", "detail": "healthy vs unhealthy fats" },
    "saturated_fat": { "level": "low|moderate|high", "category": "GOOD|MODERATE|RISK" },
    "protein": { "level": "low|moderate|high", "category": "GOOD|MODERATE|RISK" },
    "salt": { "level": "low|moderate|high", "category": "GOOD|MODERATE|RISK" },
    "fiber": { "level": "low|moderate|high", "category": "GOOD|MODERATE|RISK" }
  },
  "additive_analysis": [
    {
      "name": "Additive name or E-number",
      "fullName": "Full chemical/common name",
      "impact": "safe|caution|harmful",
      "explanation": "Why this classification"
    }
  ],
  "health_score": 0,
  "health_score_breakdown": {
    "base": 100,
    "penalties": [{ "reason": "High sugar", "points": -20 }],
    "bonuses": [{ "reason": "Good protein", "points": 10 }]
  },
  "health_status": "Healthy|Moderately Healthy|Unhealthy",
  "consumption_recommendation": {
    "level": "HIGHLY RECOMMENDED|MODERATE|LIMITED|AVOID",
    "frequency": "Daily|Weekly|Occasional|Rare|Never",
    "reason": "Why this recommendation"
  },
  "suggestions": [
    "Specific actionable suggestion 1",
    "Specific actionable suggestion 2",
    "Alternative product recommendation",
    "Lifestyle tip related to this product"
  ]
}

═══ NUTRITION SCORING RULES ═══
Health Score starts at 100. Apply:
PENALTIES: High sugar -20, High saturated fat -15, High salt -15, Each harmful additive -10, Trans fat found -20, Excessive calories -10
BONUSES: Good protein +10, Fiber present +10, Natural ingredients +5, Low sugar +5
Score ranges: 90-100=Excellent, 70-89=Good, 50-69=Moderate, <50=Poor

Consumption levels: Score>80=HIGHLY RECOMMENDED, 60-80=MODERATE, 40-60=LIMITED, <40=AVOID

═══ PERSONALIZATION RULES ═══
- If user has weight_loss goal → penalize high calories & sugar extra
- If user has diabetes → penalize sugar heavily, flag glycemic index
- If user has muscle_gain → reward protein
- If user has hypertension → penalize sodium/salt heavily
- NEVER mark unhealthy product as healthy
- Every conclusion must be JUSTIFIED
- Suggestions must be SPECIFIC, not generic

═══ ALLERGEN RULES ═══
- PRIORITIZE allergens matching user's known allergies
- "definite" = explicitly listed, "likely" = strong derivative, "possible" = ambiguous/cross-contamination
- Check Big 9 + user's custom allergens`;
}

function buildProductImagePrompt(profileContext, userName) {
    return `You are AAHAR-AI, a food product identification, allergen detection, and nutrition analysis expert.

Analyze this image of a food product. Your task:
1. Identify the product name and brand from the packaging/image
2. List ALL ingredients this product is known to contain
3. Perform full ALLERGEN ANALYSIS and NUTRITION INTELLIGENCE analysis
4. If you cannot identify the specific product, describe what type of food it appears to be

═══ USER HEALTH PROFILE ═══
${profileContext}

═══ YOUR TASK ═══
Analyze this product image SPECIFICALLY for ${userName}'s profile above.

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "productName": "Product Name",
  "brand": "Brand name or Unknown",
  "identifiedIngredients": "comma-separated list of all identified/known ingredients",
  "productSummary": "Brief description of the product",
  "personalizedSummary": "2-3 line PERSONALIZED summary for ${userName}",
  "allergens": [
    { "name": "Allergen Name", "risk": "definite|likely|possible", "triggers": ["ingredient1"], "explanation": "Why flagged", "personalNote": "Advice" }
  ],
  "safeFor": ["allergens NOT found"],
  "dietaryFlags": ["dietary violations"],
  "healthWarnings": ["health-specific warnings"],
  "summary": "2-3 sentence allergen + nutrition summary",
  "nutrition_analysis": {
    "calories": { "level": "low|moderate|high", "category": "GOOD|MODERATE|RISK", "value": "estimated kcal" },
    "sugar": { "level": "low|moderate|high", "category": "GOOD|MODERATE|RISK", "detail": "types of sugar" },
    "fat": { "level": "low|moderate|high", "category": "GOOD|MODERATE|RISK", "detail": "healthy vs unhealthy" },
    "saturated_fat": { "level": "low|moderate|high", "category": "GOOD|MODERATE|RISK" },
    "protein": { "level": "low|moderate|high", "category": "GOOD|MODERATE|RISK" },
    "salt": { "level": "low|moderate|high", "category": "GOOD|MODERATE|RISK" },
    "fiber": { "level": "low|moderate|high", "category": "GOOD|MODERATE|RISK" }
  },
  "additive_analysis": [
    { "name": "Additive/E-number", "fullName": "Full name", "impact": "safe|caution|harmful", "explanation": "Why" }
  ],
  "health_score": 0,
  "health_score_breakdown": {
    "base": 100,
    "penalties": [{ "reason": "reason", "points": -20 }],
    "bonuses": [{ "reason": "reason", "points": 10 }]
  },
  "health_status": "Healthy|Moderately Healthy|Unhealthy",
  "consumption_recommendation": {
    "level": "HIGHLY RECOMMENDED|MODERATE|LIMITED|AVOID",
    "frequency": "Daily|Weekly|Occasional|Rare|Never",
    "reason": "Why this recommendation"
  },
  "suggestions": [
    "Consumption advice",
    "Health improvement suggestion",
    "Alternative product recommendation",
    "Lifestyle tip"
  ]
}

═══ SCORING RULES ═══
Health Score starts at 100. PENALTIES: High sugar -20, High saturated fat -15, High salt -15, Harmful additive -10 each, Trans fat -20, Excessive calories -10. BONUSES: Protein +10, Fiber +10, Natural ingredients +5, Low sugar +5.
Score>80=HIGHLY RECOMMENDED, 60-80=MODERATE, 40-60=LIMITED, <40=AVOID

═══ RULES ═══
- Identify the product from packaging, branding, text visible
- Use your knowledge of commercial food products to infer ingredients
- PRIORITIZE allergens matching the user's known allergies
- NEVER mark an unhealthy product as healthy
- Every conclusion must be JUSTIFIED
- Suggestions must be SPECIFIC, not generic`;
}

module.exports = { analyzeIngredientsWithGemini, analyzeProductImageWithGemini, buildProfileContext };
