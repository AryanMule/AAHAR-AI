// ============================================================
// AAHAR-AI — Nutrition Analyzer Module (Backend)
// Server-side nutrition scoring & health analysis
// ============================================================

const THRESHOLDS = {
    calories: { low: 100, moderate: 300, high: 500 },  // per serving
    sugar: { low: 5, moderate: 12, high: 20 },          // grams
    fat: { low: 3, moderate: 10, high: 20 },             // grams
    saturated_fat: { low: 1.5, moderate: 5, high: 10 },  // grams
    protein: { low: 2, moderate: 10, high: 20 },         // grams
    salt: { low: 0.3, moderate: 1, high: 1.5 },          // grams
    fiber: { low: 1, moderate: 3, high: 5 }              // grams
};

const PENALTY_MAP = {
    high_sugar: -20,
    high_saturated_fat: -15,
    high_salt: -15,
    harmful_additive: -10,
    trans_fat: -20,
    excessive_calories: -10
};

const BONUS_MAP = {
    good_protein: 10,
    fiber_present: 10,
    natural_ingredients: 5,
    low_sugar: 5
};

// Known harmful and cautionary additives
const ADDITIVE_DB = {
    // Harmful
    'high fructose corn syrup': { impact: 'harmful', reason: 'Linked to obesity, insulin resistance, and metabolic syndrome' },
    'sodium nitrite': { impact: 'harmful', reason: 'Linked to increased cancer risk when consumed in processed meats' },
    'partially hydrogenated': { impact: 'harmful', reason: 'Contains trans fats, strongly linked to heart disease' },
    'monosodium glutamate': { impact: 'caution', reason: 'May cause headaches and sensitivity reactions in some individuals' },
    'bha': { impact: 'caution', reason: 'Possible carcinogen, banned in some countries' },
    'bht': { impact: 'caution', reason: 'Controversial preservative, possible endocrine disruptor' },
    'aspartame': { impact: 'caution', reason: 'Artificial sweetener, concerns about long-term effects' },
    'sucralose': { impact: 'caution', reason: 'Artificial sweetener, may affect gut microbiome' },
    'sodium benzoate': { impact: 'caution', reason: 'Can form benzene (carcinogen) when combined with vitamin C' },
    'potassium sorbate': { impact: 'caution', reason: 'Generally safe but may cause allergic reactions' },
    'tartrazine': { impact: 'caution', reason: 'Artificial color linked to hyperactivity in children' },
    'e102': { impact: 'caution', reason: 'Tartrazine - linked to behavioral issues in children' },
    'e110': { impact: 'caution', reason: 'Sunset Yellow - may cause allergic reactions' },
    'e129': { impact: 'caution', reason: 'Allura Red - linked to hyperactivity' },
    'e621': { impact: 'caution', reason: 'MSG - may cause sensitivity reactions' },
    // Safe
    'e322': { impact: 'safe', reason: 'Lecithin - natural emulsifier from soy or sunflower' },
    'e330': { impact: 'safe', reason: 'Citric acid - naturally occurring in citrus fruits' },
    'e300': { impact: 'safe', reason: 'Ascorbic acid (Vitamin C) - antioxidant' },
    'e306': { impact: 'safe', reason: 'Tocopherol (Vitamin E) - natural antioxidant' },
    'e440': { impact: 'safe', reason: 'Pectin - natural plant-based thickener' },
    'e500': { impact: 'safe', reason: 'Sodium bicarbonate (baking soda)' },
    'lecithin': { impact: 'safe', reason: 'Natural emulsifier, generally well-tolerated' },
    'citric acid': { impact: 'safe', reason: 'Naturally occurring in citrus fruits' },
    'ascorbic acid': { impact: 'safe', reason: 'Vitamin C, beneficial antioxidant' }
};

/**
 * Analyze nutrition data and compute health score
 * @param {Object} nutritionData - { calories, fat, saturated_fat, sugar, protein, salt, fiber }
 * @param {string[]} ingredients - ingredient list
 * @param {Object} userProfile - { healthGoals, dietType }
 * @returns {Object} - full nutrition analysis result
 */
function analyzeNutrition(nutritionData, ingredients, userProfile = {}) {
    // Step 1: Nutritional Breakdown
    const breakdown = {};
    for (const [key, thresholds] of Object.entries(THRESHOLDS)) {
        const value = nutritionData[key];
        if (value === undefined || value === null) {
            breakdown[key] = { level: 'unknown', category: 'MODERATE', value: 'N/A' };
            continue;
        }
        let level, category;
        if (value <= thresholds.low) {
            level = 'low';
            category = key === 'protein' || key === 'fiber' ? 'RISK' : 'GOOD';
        } else if (value <= thresholds.moderate) {
            level = 'moderate';
            category = 'MODERATE';
        } else {
            level = 'high';
            category = key === 'protein' || key === 'fiber' ? 'GOOD' : 'RISK';
        }
        breakdown[key] = { level, category, value: `${value}` };
    }

    // Step 2: Additive Analysis
    const additives = [];
    const lowerIngredients = (ingredients || []).join(', ').toLowerCase();
    for (const [additive, info] of Object.entries(ADDITIVE_DB)) {
        if (lowerIngredients.includes(additive)) {
            additives.push({
                name: additive,
                fullName: additive,
                impact: info.impact,
                explanation: info.reason
            });
        }
    }

    // Step 3: Health Score Calculation
    let score = 100;
    const penalties = [];
    const bonuses = [];

    // Penalties
    if (breakdown.sugar?.level === 'high') {
        score += PENALTY_MAP.high_sugar;
        penalties.push({ reason: 'High sugar content', points: PENALTY_MAP.high_sugar });
    }
    if (breakdown.saturated_fat?.level === 'high') {
        score += PENALTY_MAP.high_saturated_fat;
        penalties.push({ reason: 'High saturated fat', points: PENALTY_MAP.high_saturated_fat });
    }
    if (breakdown.salt?.level === 'high') {
        score += PENALTY_MAP.high_salt;
        penalties.push({ reason: 'High salt/sodium', points: PENALTY_MAP.high_salt });
    }
    if (breakdown.calories?.level === 'high') {
        score += PENALTY_MAP.excessive_calories;
        penalties.push({ reason: 'Excessive calories', points: PENALTY_MAP.excessive_calories });
    }
    // Each harmful additive
    const harmfulAdditives = additives.filter(a => a.impact === 'harmful');
    for (const ha of harmfulAdditives) {
        score += PENALTY_MAP.harmful_additive;
        penalties.push({ reason: `Harmful: ${ha.name}`, points: PENALTY_MAP.harmful_additive });
    }

    // Bonuses
    if (breakdown.protein?.level === 'high' || breakdown.protein?.level === 'moderate') {
        score += BONUS_MAP.good_protein;
        bonuses.push({ reason: 'Good protein content', points: BONUS_MAP.good_protein });
    }
    if (breakdown.fiber?.level === 'moderate' || breakdown.fiber?.level === 'high') {
        score += BONUS_MAP.fiber_present;
        bonuses.push({ reason: 'Contains dietary fiber', points: BONUS_MAP.fiber_present });
    }
    if (breakdown.sugar?.level === 'low') {
        score += BONUS_MAP.low_sugar;
        bonuses.push({ reason: 'Low sugar content', points: BONUS_MAP.low_sugar });
    }
    if (harmfulAdditives.length === 0 && additives.filter(a => a.impact === 'caution').length === 0) {
        score += BONUS_MAP.natural_ingredients;
        bonuses.push({ reason: 'Natural ingredients', points: BONUS_MAP.natural_ingredients });
    }

    score = Math.max(0, Math.min(100, score));

    // Step 4: Consumption Acceptability
    let level, frequency;
    if (score > 80) { level = 'HIGHLY RECOMMENDED'; frequency = 'Daily'; }
    else if (score > 60) { level = 'MODERATE'; frequency = 'Weekly'; }
    else if (score > 40) { level = 'LIMITED'; frequency = 'Occasional'; }
    else { level = 'AVOID'; frequency = 'Rare'; }

    // Step 5: Personalized Alignment
    const healthGoals = userProfile.healthGoals || [];
    if (healthGoals.includes('weight_loss') && breakdown.calories?.level === 'high') {
        score = Math.max(0, score - 10);
        penalties.push({ reason: 'High calories (weight loss goal)', points: -10 });
    }
    if (healthGoals.includes('diabetes_control') && breakdown.sugar?.level === 'high') {
        score = Math.max(0, score - 15);
        penalties.push({ reason: 'High sugar (diabetes risk)', points: -15 });
    }
    if (healthGoals.includes('muscle_gain') && breakdown.protein?.level === 'high') {
        score = Math.min(100, score + 5);
        bonuses.push({ reason: 'High protein (muscle gain)', points: 5 });
    }

    // Step 6: Classification
    let healthStatus;
    if (score >= 70) healthStatus = 'Healthy';
    else if (score >= 50) healthStatus = 'Moderately Healthy';
    else healthStatus = 'Unhealthy';

    return {
        nutrition_analysis: breakdown,
        additive_analysis: additives,
        health_score: score,
        health_score_breakdown: { base: 100, penalties, bonuses },
        health_status: healthStatus,
        consumption_recommendation: { level, frequency }
    };
}

module.exports = { analyzeNutrition, ADDITIVE_DB, THRESHOLDS };
