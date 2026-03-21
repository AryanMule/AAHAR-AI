// ============================================================
// AAHAR-AI — Explanation Generator
// Build human-readable result summaries
// ============================================================

/**
 * Generate a structured explanation from the risk evaluation results.
 *
 * @param {Object} riskResult - from evaluateRisk()
 * @param {string} rawText - original ingredient text
 * @param {Object[]} userAllergies - user's allergy profile
 * @returns {Object} - formatted explanation
 */
function generateExplanation(riskResult, rawText, userAllergies) {
    const {
        overallRiskScore,
        classification,
        matchedAllergens,
        safeAllergens,
        totalDetectedAllergens,
        totalUserMatches
    } = riskResult;

    // Build allergen details
    const allergens = matchedAllergens.map(ma => ({
        name: ma.allergen,
        risk: ma.risk,
        triggers: [ma.ingredient],
        explanation: `${ma.ingredient} is associated with ${ma.allergen} (${Math.round(ma.confidence * 100)}% confidence)`,
        personalNote: getPersonalNote(ma, classification),
        icon: ma.icon || '⚠️'
    }));

    // Build summary
    let summaryText;
    const riskPct = Math.round(overallRiskScore * 100);

    if (classification === 'safe') {
        summaryText = `✅ This product appears safe for your allergen profile. No matching allergens detected among your ${userAllergies.length} configured sensitivities.`;
    } else if (classification === 'unsafe') {
        summaryText = `🚨 HIGH RISK (${riskPct}%): This product contains ${totalUserMatches} allergen(s) matching your profile. ${matchedAllergens.map(m => m.allergen).join(', ')} detected with high confidence. AVOID this product.`;
    } else if (classification === 'caution') {
        summaryText = `⚠️ CAUTION (${riskPct}% risk): Potential allergens detected — ${matchedAllergens.map(m => m.allergen).join(', ')}. Review details below before consuming.`;
    } else {
        summaryText = `ℹ️ LOW RISK (${riskPct}%): Minor allergen associations found. ${matchedAllergens.map(m => m.allergen).join(', ')} detected with low confidence.`;
    }

    return {
        personalizedSummary: summaryText,
        riskScore: overallRiskScore,
        classification,
        allergens,
        safeFor: safeAllergens,
        dietaryFlags: [],
        healthWarnings: buildHealthWarnings(matchedAllergens, classification),
        summary: summaryText,
        totalDetected: totalDetectedAllergens,
        allDetectedAllergens: riskResult.allDetectedAllergens,
        ingredientText: rawText
    };
}

function getPersonalNote(ma, classification) {
    if (ma.severity === 'high') {
        return `🚨 You have HIGH sensitivity to ${ma.allergen}. This is a serious risk.`;
    } else if (ma.severity === 'medium') {
        return `⚠️ You have MODERATE sensitivity to ${ma.allergen}. Proceed with caution.`;
    }
    return `ℹ️ You have LOW sensitivity to ${ma.allergen}. Consider consulting your allergist.`;
}

function buildHealthWarnings(matchedAllergens, classification) {
    const warnings = [];
    const highSevMatches = matchedAllergens.filter(m => m.severity === 'high');

    if (highSevMatches.length > 0) {
        warnings.push(`⚠️ ${highSevMatches.length} high-severity allergen(s) detected: ${highSevMatches.map(m => m.allergen).join(', ')}`);
    }

    if (classification === 'unsafe') {
        warnings.push('🏥 Keep your emergency medication accessible. Contact your physician if accidentally consumed.');
    }

    return warnings;
}

module.exports = { generateExplanation };
