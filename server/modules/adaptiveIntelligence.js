// ============================================================
// AAHAR-AI — Adaptive Allergy Intelligence Engine
// Dynamic allergen learning, closed-loop feedback, discovery
// ============================================================
const { getDb } = require('../db/db');

const COMMON_ALLERGENS = ['dairy', 'nuts', 'gluten', 'soy', 'eggs', 'shellfish', 'wheat', 'peanuts', 'tree nuts'];

// ══════════════════════════════════════════════════════════════
// STEP 1: PROFILE VALIDATION — determine operating mode
// ══════════════════════════════════════════════════════════════
function validateProfile(userProfile) {
    const knownAllergies = (userProfile.allergies || []).filter(a => a.allergen || a.name);
    const hasKnown = knownAllergies.length > 0;

    // Load suspected allergies from DB
    const suspected = getSuspectedAllergies(userProfile.userId || userProfile.name || 'anonymous');

    return {
        mode: hasKnown ? 'KNOWN_ALLERGY' : (suspected.length > 0 ? 'ADAPTIVE' : 'GENERAL_SAFETY'),
        knownAllergies,
        suspectedAllergies: suspected
    };
}

// ══════════════════════════════════════════════════════════════
// STEP 2: GENERAL SAFETY MODE — warn about all common allergens
// ══════════════════════════════════════════════════════════════
function generalSafetyCheck(detectedAllergens) {
    const commonFound = [];
    for (const detected of detectedAllergens) {
        const name = (detected.name || detected.allergen || '').toLowerCase();
        for (const common of COMMON_ALLERGENS) {
            if (name.includes(common) || common.includes(name)) {
                commonFound.push(name);
                break;
            }
        }
    }

    if (commonFound.length === 0) return null;

    return {
        type: 'general_safety',
        warning: `⚠️ This product contains common allergens: ${[...new Set(commonFound)].join(', ')}. Since your allergy profile is not defined, consume cautiously.`,
        allergens: [...new Set(commonFound)],
        riskLevel: 'CAUTION'
    };
}

// ══════════════════════════════════════════════════════════════
// STEP 3: PERSONALIZED RISK EVALUATION — adaptive scoring
// ══════════════════════════════════════════════════════════════
function personalizedRiskEvaluation(detectedAllergens, profileResult) {
    const risks = [];
    const knownMap = {};
    const suspectedMap = {};

    for (const a of profileResult.knownAllergies) {
        knownMap[(a.allergen || a.name || '').toLowerCase()] = a;
    }
    for (const s of profileResult.suspectedAllergies) {
        suspectedMap[s.allergen_name.toLowerCase()] = s;
    }

    for (const detected of detectedAllergens) {
        const name = (detected.name || detected.allergen || '').toLowerCase();
        const confidence = detected.confidence || 0.7;
        let riskScore;
        let category;

        if (knownMap[name]) {
            // Known allergy: confidence × severity
            const sevWeight = { high: 1.0, medium: 0.6, low: 0.3 }[knownMap[name].severity || 'medium'];
            riskScore = confidence * sevWeight;
            category = 'known';
        } else if (suspectedMap[name]) {
            // Suspected: confidence × suspicion_confidence
            riskScore = confidence * suspectedMap[name].confidence;
            category = 'suspected';
        } else {
            // Unknown: confidence × 0.3 baseline
            riskScore = confidence * 0.3;
            category = 'unknown';
        }

        // Classify
        let status;
        if (riskScore > 0.7) status = 'UNSAFE';
        else if (riskScore >= 0.4) status = 'CAUTION';
        else status = 'SAFE';

        risks.push({
            allergen: name,
            confidence,
            riskScore: Math.round(riskScore * 100) / 100,
            status,
            category,
            suspicionConfidence: suspectedMap[name]?.confidence || null,
            triggers: detected.triggers || []
        });
    }

    // Overall risk = max of individual risks
    const maxRisk = risks.length > 0 ? Math.max(...risks.map(r => r.riskScore)) : 0;
    let overallStatus;
    if (maxRisk > 0.7) overallStatus = 'UNSAFE';
    else if (maxRisk >= 0.4) overallStatus = 'CAUTION';
    else overallStatus = 'SAFE';

    return {
        overallScore: Math.round(maxRisk * 100) / 100,
        overallStatus,
        risks
    };
}

// ══════════════════════════════════════════════════════════════
// STEP 4: FEEDBACK PROCESSING — closed-loop learning
// ══════════════════════════════════════════════════════════════
function processFeedback(userId, feedbackType, allergensPresent, productName, ingredientText, scanId) {
    const db = getDb();

    // Save feedback record
    db.prepare(`
        INSERT INTO scan_feedback (user_id, scan_id, feedback_type, allergens_present, product_name, ingredient_text)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, scanId || null, feedbackType, JSON.stringify(allergensPresent), productName || '', ingredientText || '');

    // Update suspected allergies for each allergen present
    for (const allergen of allergensPresent) {
        const name = (typeof allergen === 'string' ? allergen : allergen.name || allergen.allergen || '').toLowerCase();
        if (!name) continue;

        // Upsert suspected allergy
        const existing = db.prepare(
            'SELECT * FROM suspected_allergies WHERE user_id = ? AND allergen_name = ?'
        ).get(userId, name);

        if (feedbackType === 'discomfort') {
            if (existing) {
                const newNeg = existing.negative_count + 1;
                const newConf = calculateConfidence(newNeg, existing.positive_count);
                const newTrend = newConf > existing.confidence ? 'increasing' : 'stable';
                const newStatus = getStatus(newConf, newNeg);
                db.prepare(`
                    UPDATE suspected_allergies 
                    SET negative_count = ?, confidence = ?, trend = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = ? AND allergen_name = ?
                `).run(newNeg, newConf, newTrend, newStatus, userId, name);
            } else {
                db.prepare(`
                    INSERT INTO suspected_allergies (user_id, allergen_name, confidence, negative_count, positive_count, trend, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(userId, name, 0.2, 1, 0, 'increasing', 'monitoring');
            }
        } else if (feedbackType === 'safe') {
            if (existing) {
                const newPos = existing.positive_count + 1;
                const newConf = calculateConfidence(existing.negative_count, newPos);
                const newTrend = newConf < existing.confidence ? 'decreasing' : 'stable';
                const newStatus = getStatus(newConf, existing.negative_count);
                db.prepare(`
                    UPDATE suspected_allergies 
                    SET positive_count = ?, confidence = ?, trend = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = ? AND allergen_name = ?
                `).run(newPos, newConf, newTrend, newStatus, userId, name);
            }
            // If "safe" and no existing record → do nothing (no suspicion to reduce)
        }
    }
}

// ══════════════════════════════════════════════════════════════
// STEP 5: DYNAMIC ALLERGY PROFILE UPDATE — confidence escalation
// ══════════════════════════════════════════════════════════════
function calculateConfidence(negativeCount, positiveCount) {
    // Behavioral confidence based on feedback ratio
    const total = negativeCount + positiveCount;
    if (total === 0) return 0;
    const behavioral = negativeCount / total;
    // Scale: more data = higher confidence
    const dataScale = Math.min(1.0, total / 10); // saturates at 10 data points
    return Math.round(behavioral * dataScale * 100) / 100;
}

function getStatus(confidence, negativeCount) {
    if (confidence > 0.9) return 'probable';
    if (confidence > 0.75 || negativeCount >= 3) return 'suspected';
    return 'monitoring';
}

// ══════════════════════════════════════════════════════════════
// STEP 6: ALLERGY DISCOVERY ENGINE — cross-product pattern detection
// ══════════════════════════════════════════════════════════════
function discoverAllergies(userId) {
    const db = getDb();
    const insights = [];

    // Get all suspected allergies with sufficient data
    const suspected = db.prepare(
        'SELECT * FROM suspected_allergies WHERE user_id = ? AND negative_count >= 2 ORDER BY confidence DESC'
    ).all(userId);

    for (const s of suspected) {
        if (s.confidence >= 0.5 && s.status !== 'monitoring') {
            // Get recent feedback history to find product patterns
            const recentFeedback = db.prepare(`
                SELECT product_name, allergens_present FROM scan_feedback 
                WHERE user_id = ? AND feedback_type = 'discomfort' AND allergens_present LIKE ?
                ORDER BY created_at DESC LIMIT 5
            `).all(userId, `%${s.allergen_name}%`);

            const products = recentFeedback
                .map(f => f.product_name)
                .filter(p => p && p.length > 0);

            insights.push({
                type: 'suspected_allergy',
                allergen: s.allergen_name,
                confidence: s.confidence,
                status: s.status,
                trend: s.trend,
                negativeReports: s.negative_count,
                message: buildDiscoveryMessage(s),
                relatedProducts: [...new Set(products)].slice(0, 3)
            });
        }
    }

    return insights;
}

function buildDiscoveryMessage(suspected) {
    const pct = Math.round(suspected.confidence * 100);
    if (suspected.status === 'probable') {
        return `🔴 You may have a probable sensitivity to ${suspected.allergen_name} (Confidence: ${pct}%). You reported discomfort ${suspected.negative_count} times with products containing this allergen. Consider consulting an allergist.`;
    }
    if (suspected.status === 'suspected') {
        return `🟠 You may have sensitivity to ${suspected.allergen_name} (Confidence: ${pct}%). Based on ${suspected.negative_count} reports of discomfort.`;
    }
    return `🟡 Monitoring: Possible sensitivity to ${suspected.allergen_name} (Confidence: ${pct}%).`;
}

// ══════════════════════════════════════════════════════════════
// STEP 7: CONFIDENCE MODEL — weighted combination
// ══════════════════════════════════════════════════════════════
function computeAdaptiveConfidence(detectionConfidence, behavioralConfidence) {
    // confidence = 0.5 × detection + 0.5 × behavioral
    return Math.round((0.5 * detectionConfidence + 0.5 * (behavioralConfidence || 0)) * 100) / 100;
}

// ══════════════════════════════════════════════════════════════
// STEP 8: OUTPUT GENERATION — structured adaptive response
// ══════════════════════════════════════════════════════════════
function generateAdaptiveOutput(analysis, userProfile) {
    const userId = userProfile.userId || userProfile.name || 'anonymous';

    // Step 1: Profile validation
    const profileResult = validateProfile(userProfile);

    // Extract detected allergens from analysis (handle both Gemini and local formats)
    const detectedAllergens = extractAllergens(analysis);

    // Step 2: General Safety Mode
    let generalWarning = null;
    if (profileResult.mode === 'GENERAL_SAFETY' || profileResult.mode === 'ADAPTIVE') {
        generalWarning = generalSafetyCheck(detectedAllergens);
        // If no allergens were extracted but we have ingredient text, scan text directly
        if (!generalWarning && profileResult.mode === 'GENERAL_SAFETY') {
            const ingredientText = (analysis.ingredientText || analysis.identifiedIngredients || '').toLowerCase();
            if (ingredientText) {
                const textAllergens = scanTextForAllergens(ingredientText);
                if (textAllergens.length > 0) {
                    generalWarning = {
                        type: 'general_safety',
                        warning: `⚠️ This product contains common allergens: ${textAllergens.join(', ')}. Since your allergy profile is not defined, consume cautiously.`,
                        allergens: textAllergens,
                        riskLevel: 'CAUTION'
                    };
                }
            }
        }
    }

    // Step 3: Personalized risk evaluation
    const riskEval = personalizedRiskEvaluation(detectedAllergens, profileResult);

    // Step 6: Allergy discovery
    const adaptiveInsights = discoverAllergies(userId);

    // Build profile updates from suspected allergies
    const profileUpdates = {};
    for (const s of profileResult.suspectedAllergies) {
        profileUpdates[s.allergen_name] = {
            confidence: s.confidence,
            trend: s.trend,
            status: s.status
        };
    }

    return {
        adaptive_mode: profileResult.mode,
        risk_assessment: {
            status: riskEval.overallStatus,
            score: riskEval.overallScore,
            details: riskEval.risks
        },
        general_warning: generalWarning?.warning || null,
        general_warning_allergens: generalWarning?.allergens || [],
        adaptive_insights: adaptiveInsights,
        profile_updates: profileUpdates,
        suspected_allergies: profileResult.suspectedAllergies.map(s => ({
            name: s.allergen_name,
            confidence: s.confidence,
            status: s.status,
            trend: s.trend
        }))
    };
}

// ── Helpers ──────────────────────────────────────────────────

function getSuspectedAllergies(userId) {
    try {
        const db = getDb();
        return db.prepare(
            'SELECT * FROM suspected_allergies WHERE user_id = ? ORDER BY confidence DESC'
        ).all(userId);
    } catch (e) {
        return [];
    }
}

function extractAllergens(analysis) {
    // 1. Prioritize allDetectedAllergens (from updated local pipeline)
    if (analysis.allDetectedAllergens && Array.isArray(analysis.allDetectedAllergens) && analysis.allDetectedAllergens.length > 0) {
        return analysis.allDetectedAllergens.map(a => ({
            name: a.allergen || a.name || '',
            confidence: a.confidence || 0.7,
            triggers: [a.ingredient],
            risk: a.risk || 'possible'
        }));
    }
    // 2. Handle Gemini AI format (allergens array)
    if (analysis.allergens && Array.isArray(analysis.allergens) && analysis.allergens.length > 0) {
        return analysis.allergens.map(a => ({
            name: a.name || a.allergen || '',
            confidence: riskToConfidence(a.risk),
            triggers: a.triggers || [],
            risk: a.risk || 'possible'
        }));
    }
    // 3. Handle old local pipeline format (matchedAllergens)
    if (analysis.matchedAllergens && Array.isArray(analysis.matchedAllergens) && analysis.matchedAllergens.length > 0) {
        return analysis.matchedAllergens.map(a => ({
            name: a.allergen || a.name || '',
            confidence: a.confidence || 0.7,
            triggers: [a.ingredient],
            risk: a.risk || 'possible'
        }));
    }
    return [];
}

function riskToConfidence(risk) {
    switch ((risk || '').toLowerCase()) {
        case 'definite': return 0.95;
        case 'likely': return 0.75;
        case 'possible': return 0.5;
        default: return 0.6;
    }
}

function scanTextForAllergens(text) {
    const allergenKeywords = {
        dairy: ['milk', 'cheese', 'butter', 'cream', 'whey', 'casein', 'lactose', 'yogurt', 'curd', 'ghee', 'paneer'],
        gluten: ['wheat', 'flour', 'barley', 'rye', 'oats', 'semolina', 'maida', 'atta', 'gluten'],
        soy: ['soy', 'soya', 'soybean', 'tofu', 'lecithin', 'edamame'],
        eggs: ['egg', 'albumin', 'ovalbumin', 'lysozyme', 'meringue', 'mayonnaise'],
        nuts: ['almond', 'cashew', 'walnut', 'pistachio', 'hazelnut', 'macadamia', 'pecan', 'tree nut'],
        peanuts: ['peanut', 'groundnut', 'arachis'],
        shellfish: ['shrimp', 'prawn', 'crab', 'lobster', 'shellfish', 'crustacean']
    };

    const found = [];
    for (const [allergen, keywords] of Object.entries(allergenKeywords)) {
        for (const kw of keywords) {
            if (text.includes(kw)) {
                found.push(allergen);
                break;
            }
        }
    }
    return [...new Set(found)];
}

module.exports = {
    validateProfile,
    generalSafetyCheck,
    personalizedRiskEvaluation,
    processFeedback,
    discoverAllergies,
    computeAdaptiveConfidence,
    generateAdaptiveOutput,
    getSuspectedAllergies,
    COMMON_ALLERGENS
};
