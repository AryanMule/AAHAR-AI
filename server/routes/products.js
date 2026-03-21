// ============================================================
// AAHAR-AI — Product Routes
// GET /api/products/:id, POST /api/products
// ============================================================
const express = require('express');
const router = express.Router();
const { getDb } = require('../db/db');
const { authMiddleware } = require('./auth');

// GET /api/products/search?q=name
router.get('/search', (req, res) => {
    try {
        const q = req.query.q;
        if (!q) return res.status(400).json({ error: 'Search query required' });

        const db = getDb();
        const products = db.prepare(`
            SELECT p.*, GROUP_CONCAT(i.name, ', ') as ingredients_list
            FROM products p
            LEFT JOIN product_ingredients pi ON p.id = pi.product_id
            LEFT JOIN ingredients i ON pi.ingredient_id = i.id
            WHERE p.name LIKE ? OR p.brand LIKE ?
            GROUP BY p.id
            LIMIT 20
        `).all(`%${q}%`, `%${q}%`);

        res.json(products);
    } catch (err) {
        console.error('Product search error:', err);
        res.status(500).json({ error: 'Search failed' });
    }
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
    try {
        const db = getDb();
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
        if (!product) return res.status(404).json({ error: 'Product not found' });

        const ingredients = db.prepare(`
            SELECT i.name, pi.position
            FROM product_ingredients pi JOIN ingredients i ON pi.ingredient_id = i.id
            WHERE pi.product_id = ? ORDER BY pi.position
        `).all(req.params.id);

        const nutrition = db.prepare('SELECT * FROM nutrition_data WHERE product_id = ?').get(req.params.id);

        res.json({ ...product, ingredients, nutrition });
    } catch (err) {
        console.error('Product fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

// POST /api/products — add a new product (with ingredients)
router.post('/', authMiddleware, (req, res) => {
    try {
        const { name, brand, ingredients, barcode, description } = req.body;
        if (!name) return res.status(400).json({ error: 'Product name is required' });

        const db = getDb();

        const result = db.prepare(`
            INSERT INTO products (name, brand, barcode, description)
            VALUES (?, ?, ?, ?)
        `).run(name, brand || 'Unknown', barcode || null, description || null);

        const productId = result.lastInsertRowid;

        if (ingredients && Array.isArray(ingredients)) {
            const insertIng = db.prepare('INSERT OR IGNORE INTO ingredients (name, normalized_name) VALUES (?, ?)');
            const getIngId = db.prepare('SELECT id FROM ingredients WHERE normalized_name = ?');
            const linkIng = db.prepare('INSERT OR IGNORE INTO product_ingredients (product_id, ingredient_id, position) VALUES (?, ?, ?)');

            ingredients.forEach((ing, idx) => {
                const normalized = ing.toLowerCase().trim();
                insertIng.run(ing, normalized);
                const row = getIngId.get(normalized);
                if (row) linkIng.run(productId, row.id, idx);
            });
        }

        res.status(201).json({ id: productId, name, brand });
    } catch (err) {
        console.error('Product create error:', err);
        res.status(500).json({ error: 'Failed to create product' });
    }
});

module.exports = router;
