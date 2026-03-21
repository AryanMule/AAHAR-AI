// ============================================================
// AAHAR-AI — Feedback Routes (Adaptive Intelligence)
// POST /api/feedback — closed-loop learning
// GET  /api/feedback/insights — get adaptive insights
// ============================================================
const express = require('express');
const router = express.Router();
const { processFeedback, discoverAllergies, getSuspectedAllergies } = require('../modules/adaptiveIntelligence');

// POST /api/feedback — submit feedback on a scan result (discomfort or safe)
router.post('/', (req, res) => {
    try {
        const { userId, feedbackType, allergensPresent, productName, ingredientText, scanId } = req.body;

        if (!userId || !feedbackType) {
            return res.status(400).json({ error: 'userId and feedbackType are required' });
        }

        if (!['discomfort', 'safe'].includes(feedbackType)) {
            return res.status(400).json({ error: 'feedbackType must be "discomfort" or "safe"' });
        }

        const allergens = allergensPresent || [];

        // Process feedback through adaptive intelligence engine
        processFeedback(userId, feedbackType, allergens, productName, ingredientText, scanId);

        // Discover patterns after processing
        const insights = discoverAllergies(userId);
        const suspected = getSuspectedAllergies(userId);

        res.json({
            success: true,
            message: feedbackType === 'discomfort'
                ? '⚠️ Feedback recorded. We will learn from your response to improve future alerts.'
                : '✅ Feedback recorded. Glad this product was safe for you!',
            adaptive_insights: insights,
            suspected_allergies: suspected.map(s => ({
                name: s.allergen_name,
                confidence: s.confidence,
                status: s.status,
                trend: s.trend,
                negativeCount: s.negative_count,
                positiveCount: s.positive_count
            }))
        });
    } catch (err) {
        console.error('Feedback error:', err);
        res.status(500).json({ error: 'Failed to submit feedback' });
    }
});

// GET /api/feedback/insights — get a user's adaptive intelligence data
router.get('/insights', (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        const insights = discoverAllergies(userId);
        const suspected = getSuspectedAllergies(userId);

        res.json({
            adaptive_insights: insights,
            suspected_allergies: suspected.map(s => ({
                name: s.allergen_name,
                confidence: s.confidence,
                status: s.status,
                trend: s.trend,
                negativeCount: s.negative_count,
                positiveCount: s.positive_count
            }))
        });
    } catch (err) {
        console.error('Insights error:', err);
        res.status(500).json({ error: 'Failed to fetch insights' });
    }
});

module.exports = router;
