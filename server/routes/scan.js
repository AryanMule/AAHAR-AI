// ============================================================
// AAHAR-AI — Scan Routes (Gemini-powered)
// POST /api/scan/text, POST /api/scan/image, GET /api/scan/history
// ============================================================
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { getDb } = require('../db/db');
const { analyzeIngredientsWithGemini, analyzeProductImageWithGemini } = require('../modules/geminiService');
const { generateAdaptiveOutput } = require('../modules/adaptiveIntelligence');
const { processImage } = require('../modules/imageProcessor');
const { extractText } = require('../modules/ocrModule');
const { tokenizeIngredients } = require('../modules/nlpTokenizer');
const { mapAllergens } = require('../modules/allergenMapper');
const { evaluateRisk } = require('../modules/riskEvaluator');
const { generateExplanation } = require('../modules/explanationGen');
const { analyzeNutrition } = require('../modules/nutritionAnalyzer');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const fs = require('fs');
const configPath = require('path').join(__dirname, '..', 'admin-config.json');

/**
 * Get the Gemini API key from (priority order):
 * 1. Server-side admin config file (admin-config.json)
 * 2. Request body (passed from frontend)
 * 3. Server environment variable
 */
function getApiKey(req) {
    // Try server-side config first
    try {
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (config.geminiApiKey) return config.geminiApiKey;
        }
    } catch (e) { /* ignore */ }
    return req.body?.apiKey || req.query?.apiKey || process.env.GEMINI_API_KEY || null;
}

/**
 * Build user profile from request body or DB
 */
function getUserProfile(req) {
    // Accept profile from request body (from frontend localStorage)
    if (req.body?.userProfile) {
        return req.body.userProfile;
    }
    // Fallback: minimal profile
    return { name: 'User', allergies: [], sensitivityLevel: 'moderate' };
}

// ══════════════════════════════════════════════════════════════
// POST /api/scan/text — Analyze ingredient text
// ══════════════════════════════════════════════════════════════
router.post('/text', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text || !text.trim()) {
            return res.status(400).json({ error: 'No ingredient text provided' });
        }

        const apiKey = getApiKey(req);
        const userProfile = getUserProfile(req);

        let analysis;

        if (apiKey) {
            // ── Primary: Gemini AI analysis ──
            try {
                analysis = await analyzeIngredientsWithGemini(text.trim(), userProfile, apiKey);
            } catch (geminiErr) {
                console.warn('Gemini failed, falling back to local pipeline:', geminiErr.message);
                analysis = await localPipeline(text.trim(), userProfile, apiKey);
            }
        } else {
            // ── Fallback: Local processing pipeline ──
            analysis = await localPipeline(text.trim(), userProfile, null);
        }

        // Run adaptive intelligence engine
        const adaptiveResult = generateAdaptiveOutput(analysis, userProfile);

        // Save to scan history if user ID provided
        const scanId = saveScanHistory(req.body?.userId, 'text', text, analysis);

        res.json({ scanId, ...analysis, ...adaptiveResult });
    } catch (err) {
        console.error('Text scan error:', err);
        res.status(500).json({ error: 'Analysis failed: ' + err.message });
    }
});

// ══════════════════════════════════════════════════════════════
// POST /api/scan/image — Analyze uploaded image
// ══════════════════════════════════════════════════════════════
router.post('/image', upload.single('image'), async (req, res) => {
    try {
        const scanType = req.body?.scanType || 'ocr';
        const imageBuffer = req.file?.buffer;
        const mimeType = req.file?.mimetype || 'image/png';

        if (!imageBuffer) {
            return res.status(400).json({ error: 'No image provided' });
        }

        const apiKey = getApiKey(req);
        const userProfile = getUserProfile(req);

        let analysis;

        if (scanType === 'product' && apiKey) {
            // ── Product Image Mode: Gemini Vision ──
            try {
                analysis = await analyzeProductImageWithGemini(imageBuffer, mimeType, userProfile, apiKey);
            } catch (visionErr) {
                console.warn('Gemini Vision failed, falling back to OCR:', visionErr.message);
                // Fallback: try OCR on the image
                analysis = await ocrPipeline(imageBuffer, userProfile, apiKey);
            }
        } else {
            // ── OCR Mode: Extract text → analyze ──
            analysis = await ocrPipeline(imageBuffer, userProfile, apiKey);
        }

        const adaptiveResult = generateAdaptiveOutput(analysis, userProfile);
        const scanId = saveScanHistory(req.body?.userId, scanType, analysis.identifiedIngredients || '', analysis);

        res.json({ scanId, ...analysis, ...adaptiveResult });
    } catch (err) {
        console.error('Image scan error:', err);
        res.status(500).json({ error: 'Scan failed: ' + err.message });
    }
});

// ══════════════════════════════════════════════════════════════
// POST /api/scan/image-base64 — Analyze base64 image (for webcam captures)
// ══════════════════════════════════════════════════════════════
router.post('/image-base64', async (req, res) => {
    try {
        const { imageData, scanType } = req.body;
        if (!imageData) {
            return res.status(400).json({ error: 'No image data provided' });
        }

        const apiKey = getApiKey(req);
        const userProfile = getUserProfile(req);

        // Convert base64 data URL to buffer
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const mimeType = imageData.match(/^data:(image\/\w+);/)?.[1] || 'image/png';

        let analysis;

        if ((scanType === 'product') && apiKey) {
            try {
                analysis = await analyzeProductImageWithGemini(imageBuffer, mimeType, userProfile, apiKey);
            } catch (visionErr) {
                console.warn('Gemini Vision failed, falling back to OCR:', visionErr.message);
                analysis = await ocrPipeline(imageBuffer, userProfile, apiKey);
            }
        } else {
            analysis = await ocrPipeline(imageBuffer, userProfile, apiKey);
        }

        const adaptiveResult = generateAdaptiveOutput(analysis, userProfile);
        const scanId = saveScanHistory(req.body?.userId, scanType || 'ocr', analysis.identifiedIngredients || '', analysis);

        res.json({ scanId, ...analysis, ...adaptiveResult });
    } catch (err) {
        console.error('Base64 image scan error:', err);
        res.status(500).json({ error: 'Scan failed: ' + err.message });
    }
});

// ══════════════════════════════════════════════════════════════
// GET /api/scan/history — user's scan history
// ══════════════════════════════════════════════════════════════
router.get('/history', (req, res) => {
    try {
        const db = getDb();
        const userId = req.query.userId;
        const limit = parseInt(req.query.limit) || 20;

        let scans;
        if (userId) {
            scans = db.prepare(`
                SELECT id, scan_type, input_text, risk_score, source, created_at
                FROM scan_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?
            `).all(userId, limit);
        } else {
            scans = db.prepare(`
                SELECT id, scan_type, input_text, risk_score, source, created_at
                FROM scan_history ORDER BY created_at DESC LIMIT ?
            `).all(limit);
        }

        res.json(scans);
    } catch (err) {
        console.error('History fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// ══════════════════════════════════════════════════════════════
// Local processing pipeline (fallback when no API key)
// ══════════════════════════════════════════════════════════════
async function localPipeline(text, userProfile, apiKey) {
    // 1. Tokenize ingredients
    const ingredients = tokenizeIngredients(text);

    // 2. Allergen mapping (DB + keyword + optional AI)
    const allergenResults = await mapAllergens(ingredients, apiKey);

    // 3. Risk evaluation
    const userAllergies = (userProfile.allergies || []).map(a => ({
        name: a.allergen || a.name,
        severity: a.severity || 'medium',
        weight: a.weight || 0.6
    }));
    const riskResult = evaluateRisk(allergenResults, userAllergies);

    // 4. Generate explanation
    const explanation = generateExplanation(riskResult, text, userAllergies);

    explanation._source = apiKey ? 'server-ai' : 'server-local';
    return explanation;
}

async function ocrPipeline(imageBuffer, userProfile, apiKey) {
    // 1. Preprocess image
    const processed = await processImage(imageBuffer);

    // 2. OCR
    const extractedText = await extractText(processed);

    // 3. If we have an API key, use Gemini for full analysis
    if (apiKey) {
        try {
            const analysis = await analyzeIngredientsWithGemini(extractedText, userProfile, apiKey);
            analysis._ocrText = extractedText;
            return analysis;
        } catch (e) {
            console.warn('Gemini failed after OCR, using local pipeline:', e.message);
        }
    }

    // 4. Fallback: local pipeline
    const result = await localPipeline(extractedText, userProfile, apiKey);
    result._ocrText = extractedText;
    return result;
}

function saveScanHistory(userId, scanType, inputText, analysis) {
    if (!userId) return null; // Skip if no valid user ID (avoid FK constraint)
    try {
        const db = getDb();
        const result = db.prepare(`
            INSERT INTO scan_history (user_id, scan_type, input_text, result_json, risk_score, source)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            userId,
            scanType,
            typeof inputText === 'string' ? inputText : JSON.stringify(inputText),
            JSON.stringify(analysis),
            analysis.riskScore || analysis.overallRiskScore || 0,
            analysis._source || 'unknown'
        );
        return result.lastInsertRowid;
    } catch (e) {
        console.warn('Failed to save scan history:', e.message);
        return null;
    }
}

module.exports = router;
