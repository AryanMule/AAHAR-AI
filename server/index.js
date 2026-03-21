// ============================================================
// AAHAR-AI — Express Server
// ============================================================
const express = require('express');
const cors = require('cors');
const path = require('path');
const { getDb, closeDb } = require('./db/db');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..')));

// ── API Routes ─────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/scan', require('./routes/scan'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/products', require('./routes/products'));
app.use('/api/admin', require('./routes/admin'));

// ── Health check ───────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', system: 'AAHAR-AI', version: '1.0.0' });
});

// ── Fallback: serve index.html for any non-API route ───────
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '..', 'index.html'));
    }
});

// ── Start ──────────────────────────────────────────────────
app.listen(PORT, () => {
    // Initialize DB on startup
    getDb();
    console.log(`\n🛡️  AAHAR-AI Server running on http://localhost:${PORT}`);
    console.log(`   API: http://localhost:${PORT}/api/health\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    closeDb();
    process.exit(0);
});
