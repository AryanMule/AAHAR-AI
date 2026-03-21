// ============================================================
// AAHAR-AI — Admin Routes
// POST /api/admin/config, GET /api/admin/config
// Server-side API key management
// ============================================================
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '..', 'admin-config.json');

function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        }
    } catch (e) {
        console.warn('Failed to load admin config:', e.message);
    }
    return { geminiApiKey: '', adminPassword: 'aaharai_admin' };
}

function saveConfig(config) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// GET /api/admin/config — check if API key is set (does NOT return the key)
router.get('/config', (req, res) => {
    const config = loadConfig();
    res.json({
        hasApiKey: !!config.geminiApiKey,
        apiKeyPreview: config.geminiApiKey ? config.geminiApiKey.slice(0, 6) + '...' : null
    });
});

// POST /api/admin/config — save API key (requires admin password)
router.post('/config', (req, res) => {
    const { adminPassword, geminiApiKey } = req.body;
    const config = loadConfig();

    if (adminPassword !== config.adminPassword) {
        return res.status(403).json({ error: 'Invalid admin password' });
    }

    if (geminiApiKey !== undefined) {
        config.geminiApiKey = geminiApiKey;
    }

    saveConfig(config);
    res.json({ success: true, hasApiKey: !!config.geminiApiKey });
});

// POST /api/admin/change-password — change admin password
router.post('/change-password', (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const config = loadConfig();

    if (currentPassword !== config.adminPassword) {
        return res.status(403).json({ error: 'Invalid current password' });
    }

    config.adminPassword = newPassword;
    saveConfig(config);
    res.json({ success: true });
});

// GET /api/admin/api-key — internal-only: returns the actual key for scan routes
router.get('/api-key', (req, res) => {
    const config = loadConfig();
    res.json({ apiKey: config.geminiApiKey || null });
});

module.exports = router;
