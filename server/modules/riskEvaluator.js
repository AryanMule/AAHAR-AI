// ============================================================
// AAHAR-AI — Risk Evaluator Module
// Personalized risk scoring: confidence × severity × user weight
// ============================================================

const SEVERITY_MULTIPLIER = { high: 1.0, medium: 0.6, low: 0.3 };

/**
 * Evaluate personalized risk based on detected allergens and user profile.
 *
 * RiskScore = Σ (confidence × severity_weight × user_weight) / max_possible
 *
 * @param {Object[]} allergenResults - from allergen mapper
 * @param {Object[]} userAllergies - user's configured allergies (name, severity, weight)
 * @returns {Object} - risk classification and details
 */
function evaluateRisk(allergenResults, userAllergies) {
    let totalRisk = 0;
    let maxRisk = 0;
    const matchedAllergens = [];
    const safeAllergens = [];

    // Check each detected allergen against user profile
    for (const result of allergenResults) {
        // Fuzzy match: result.allergen vs user setup name (e.g., 'Dairy' vs 'Milk / Dairy')
        const rName = result.allergen.toLowerCase();
        let matchedUserAllergy = null;

        for (const ua of userAllergies) {
            const uName = ua.name.toLowerCase();
            if (rName.includes(uName) || uName.includes(rName)) {
                matchedUserAllergy = ua;
                break;
            }
        }

        if (matchedUserAllergy) {
            const sevMultiplier = SEVERITY_MULTIPLIER[matchedUserAllergy.severity] || 0.6;
            const riskContribution = result.confidence * sevMultiplier * (matchedUserAllergy.weight || 0.6);
            totalRisk += riskContribution;

            // Only push to matchedAllergens if we haven't already for this allergen category
            if (!matchedAllergens.some(m => m.allergen === result.allergen)) {
                matchedAllergens.push({
                    allergen: result.allergen,
                    ingredient: result.ingredient,
                    confidence: result.confidence,
                    risk: result.risk,
                    severity: matchedUserAllergy.severity,
                    riskContribution: Math.round(riskContribution * 100) / 100,
                    source: result.source,
                    icon: result.icon
                });
            }
        }
    }

    // Max possible risk = number of user allergies × max severity
    maxRisk = Math.max(1, userAllergies.length * 0.6);
    const overallRiskScore = Math.min(1.0, totalRisk / maxRisk);

    // Classify
    let classification;
    if (matchedAllergens.length === 0) {
        classification = 'safe';
    } else if (overallRiskScore >= 0.6) {
        classification = 'unsafe';
    } else if (overallRiskScore >= 0.3) {
        classification = 'caution';
    } else {
        classification = 'low_risk';
    }

    // Determine safe allergens
    for (const ua of userAllergies) {
        const uName = ua.name.toLowerCase();
        const isMatched = matchedAllergens.some(m => {
            const mName = m.allergen.toLowerCase();
            return mName.includes(uName) || uName.includes(mName);
        });
        if (!isMatched) {
            safeAllergens.push(ua.name);
        }
    }

    return {
        overallRiskScore: Math.round(overallRiskScore * 100) / 100,
        classification,
        matchedAllergens,
        safeAllergens,
        allDetectedAllergens: allergenResults,   // <--- Added to pass FULL context to Adaptive Engine
        totalDetectedAllergens: allergenResults.length,
        totalUserMatches: matchedAllergens.length
    };
}

module.exports = { evaluateRisk };
