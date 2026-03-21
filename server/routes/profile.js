// ============================================================
// AAHAR-AI — Profile Routes
// GET /api/profile, PUT /api/profile
// ============================================================
const express = require('express');
const router = express.Router();
const { getDb } = require('../db/db');
const { authMiddleware } = require('./auth');

// GET /api/profile — get current user profile + allergies
router.get('/', authMiddleware, (req, res) => {
    try {
        const db = getDb();
        const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(req.userId) || {};
        const allergies = db.prepare(`
            SELECT ua.*, a.name as allergen_name, a.icon
            FROM user_allergies ua JOIN allergens a ON ua.allergen_id = a.id
            WHERE ua.user_id = ?
        `).all(req.userId);

        res.json({
            ...user,
            preferences: {
                sensitivityLevel: prefs.sensitivity_level || 'moderate',
                alertPreference: prefs.alert_preference || 'strict_warning',
                dietPreferences: JSON.parse(prefs.diet_preferences || '[]'),
                medicalConditions: JSON.parse(prefs.medical_conditions || '[]'),
                customAllergens: JSON.parse(prefs.custom_allergens || '[]'),
                emergencyContact: {
                    name: prefs.emergency_contact_name || '',
                    phone: prefs.emergency_contact_phone || ''
                }
            },
            allergies: allergies.map(a => ({
                allergen: a.allergen_name,
                icon: a.icon,
                severity: a.severity,
                weight: a.weight
            }))
        });
    } catch (err) {
        console.error('Profile fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// PUT /api/profile — update profile + allergies
router.put('/', authMiddleware, (req, res) => {
    try {
        const db = getDb();
        const { name, allergies, preferences } = req.body;

        if (name) {
            db.prepare('UPDATE users SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(name, req.userId);
        }

        if (preferences) {
            db.prepare(`
                INSERT OR REPLACE INTO user_preferences
                (user_id, sensitivity_level, alert_preference, diet_preferences, medical_conditions, custom_allergens, emergency_contact_name, emergency_contact_phone)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                req.userId,
                preferences.sensitivityLevel || 'moderate',
                preferences.alertPreference || 'strict_warning',
                JSON.stringify(preferences.dietPreferences || []),
                JSON.stringify(preferences.medicalConditions || []),
                JSON.stringify(preferences.customAllergens || []),
                preferences.emergencyContact?.name || '',
                preferences.emergencyContact?.phone || ''
            );
        }

        if (allergies && Array.isArray(allergies)) {
            // Clear existing and re-insert
            db.prepare('DELETE FROM user_allergies WHERE user_id = ?').run(req.userId);
            const insertAllergy = db.prepare(`
                INSERT INTO user_allergies (user_id, allergen_id, severity, weight)
                SELECT ?, id, ?, ? FROM allergens WHERE name = ?
            `);
            for (const a of allergies) {
                insertAllergy.run(req.userId, a.severity || 'medium', a.weight || 0.6, a.allergen);
            }
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Profile update error:', err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

module.exports = router;
