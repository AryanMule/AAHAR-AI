// ============================================================
// AAHAR-AI — Database Connection Helper
// ============================================================
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'aaharai.db');

let db;

function getDb() {
    if (!db) {
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
        initSchema();
    }
    return db;
}

function initSchema() {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    db.exec(schema);
    console.log('✅ Database schema initialized');
    seedDb();
}

function seedDb() {
    const count = db.prepare('SELECT count(*) as c FROM allergens').get();
    if (count.c > 0) return; // Already seeded

    const defaultAllergens = [
        { name: 'Dairy', icon: '🥛', keywords: ['milk', 'cheese', 'butter', 'cream', 'whey', 'casein', 'lactose', 'yogurt', 'curd', 'ghee', 'paneer'] },
        { name: 'Gluten', icon: '🌾', keywords: ['wheat', 'flour', 'barley', 'rye', 'oats', 'semolina', 'maida', 'atta', 'gluten'] },
        { name: 'Soy', icon: '🌱', keywords: ['soy', 'soya', 'soybean', 'tofu', 'lecithin', 'edamame'] },
        { name: 'Eggs', icon: '🥚', keywords: ['egg', 'albumin', 'ovalbumin', 'lysozyme', 'meringue', 'mayonnaise'] },
        { name: 'Tree Nuts', icon: '🌰', keywords: ['almond', 'cashew', 'walnut', 'pistachio', 'hazelnut', 'macadamia', 'pecan', 'tree nut', 'nuts'] },
        { name: 'Peanuts', icon: '🥜', keywords: ['peanut', 'groundnut', 'arachis'] },
        { name: 'Shellfish', icon: '🦐', keywords: ['shrimp', 'prawn', 'crab', 'lobster', 'shellfish', 'crustacean'] },
        { name: 'Fish', icon: '🐟', keywords: ['fish', 'salmon', 'tuna', 'cod', 'anchovy'] },
        { name: 'Sesame', icon: '🌱', keywords: ['sesame', 'tahini'] }
    ];

    const insert = db.prepare('INSERT INTO allergens (name, icon, keywords) VALUES (?, ?, ?)');
    
    db.transaction(() => {
        for (const a of defaultAllergens) {
            insert.run(a.name, a.icon, JSON.stringify(a.keywords));
        }
    })();
    
    console.log('🌱 Database seeded with default allergens');
}

function closeDb() {
    if (db) {
        db.close();
        db = null;
    }
}

module.exports = { getDb, closeDb };
