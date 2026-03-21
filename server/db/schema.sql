-- ============================================================
-- AAHAR-AI Database Schema
-- SQLite3
-- ============================================================

-- Users & Authentication
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User allergy profiles
CREATE TABLE IF NOT EXISTS user_allergies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    allergen_id INTEGER NOT NULL REFERENCES allergens(id),
    severity TEXT CHECK(severity IN ('low', 'medium', 'high')) DEFAULT 'medium',
    weight REAL DEFAULT 0.6,
    UNIQUE(user_id, allergen_id)
);

-- User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    sensitivity_level TEXT CHECK(sensitivity_level IN ('mild', 'moderate', 'strict')) DEFAULT 'moderate',
    alert_preference TEXT DEFAULT 'strict_warning',
    diet_preferences TEXT DEFAULT '[]',           -- JSON array
    medical_conditions TEXT DEFAULT '[]',          -- JSON array
    custom_allergens TEXT DEFAULT '[]',            -- JSON array
    emergency_contact_name TEXT DEFAULT '',
    emergency_contact_phone TEXT DEFAULT ''
);

-- Master allergen list
CREATE TABLE IF NOT EXISTS allergens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    category TEXT DEFAULT 'common',               -- common, rare, chemical
    icon TEXT DEFAULT '⚠️',
    keywords TEXT NOT NULL DEFAULT '[]'            -- JSON array of keyword strings
);

-- Products
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    brand TEXT DEFAULT 'Unknown',
    image_url TEXT,
    barcode TEXT,
    description TEXT,
    verified INTEGER DEFAULT 0,                    -- 0=unverified, 1=verified by feedback
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Normalized ingredients
CREATE TABLE IF NOT EXISTS ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    normalized_name TEXT NOT NULL,                  -- lowercase, trimmed
    category TEXT DEFAULT 'general'
);

-- Product ↔ Ingredient mapping
CREATE TABLE IF NOT EXISTS product_ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    ingredient_id INTEGER NOT NULL REFERENCES ingredients(id),
    position INTEGER DEFAULT 0,                    -- order in ingredient list
    UNIQUE(product_id, ingredient_id)
);

-- Ingredient ↔ Allergen mapping with confidence
CREATE TABLE IF NOT EXISTS ingredient_allergens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ingredient_id INTEGER NOT NULL REFERENCES ingredients(id),
    allergen_id INTEGER NOT NULL REFERENCES allergens(id),
    confidence_score REAL DEFAULT 0.8,             -- 0.0–1.0
    risk_level TEXT CHECK(risk_level IN ('definite', 'likely', 'possible')) DEFAULT 'likely',
    source TEXT DEFAULT 'system',                  -- system, ai, user_feedback
    UNIQUE(ingredient_id, allergen_id)
);

-- Nutrition data per product
CREATE TABLE IF NOT EXISTS nutrition_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    serving_size TEXT,
    calories REAL,
    total_fat REAL,
    saturated_fat REAL,
    sodium REAL,
    total_carbs REAL,
    sugar REAL,
    protein REAL,
    fiber REAL,
    extra_data TEXT DEFAULT '{}'                    -- JSON for additional nutrients
);

-- Scan history
CREATE TABLE IF NOT EXISTS scan_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    scan_type TEXT CHECK(scan_type IN ('product_image', 'ocr', 'text')) NOT NULL,
    input_text TEXT,                               -- raw ingredient text or product name
    result_json TEXT NOT NULL,                     -- full analysis JSON
    risk_score REAL,
    source TEXT DEFAULT 'gemini',                  -- gemini, gemini-vision, fallback
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User feedback for closed-loop learning
CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scan_id INTEGER NOT NULL REFERENCES scan_history(id) ON DELETE CASCADE,
    feedback_type TEXT CHECK(feedback_type IN ('correct', 'incorrect', 'missing_allergen', 'false_positive')) NOT NULL,
    allergen_id INTEGER REFERENCES allergens(id),
    comment TEXT,
    processed INTEGER DEFAULT 0,                   -- 0=pending, 1=applied
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_allergies_user ON user_allergies(user_id);
CREATE INDEX IF NOT EXISTS idx_product_ingredients_product ON product_ingredients(product_id);
CREATE INDEX IF NOT EXISTS idx_ingredient_allergens_ingredient ON ingredient_allergens(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_scan_history_user ON scan_history(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_scan ON feedback(scan_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

-- ============================================================
-- Adaptive Allergy Intelligence — Dynamic learning tables
-- ============================================================

-- Suspected allergies — dynamically learned from user feedback patterns
CREATE TABLE IF NOT EXISTS suspected_allergies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,                            -- localStorage user ID or DB user ID
    allergen_name TEXT NOT NULL,                      -- e.g. "dairy", "gluten"
    confidence REAL DEFAULT 0.0,                      -- 0.0–1.0 suspicion confidence
    negative_count INTEGER DEFAULT 0,                 -- # of "discomfort" reports involving this allergen
    positive_count INTEGER DEFAULT 0,                 -- # of "safe" reports involving this allergen
    trend TEXT DEFAULT 'stable',                      -- increasing, decreasing, stable
    status TEXT DEFAULT 'monitoring',                 -- monitoring, suspected, probable
    first_reported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, allergen_name)
);

-- Per-scan user feedback for adaptive learning
CREATE TABLE IF NOT EXISTS scan_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,                            -- localStorage user ID or DB user ID
    scan_id INTEGER,                                  -- optional link to scan_history
    feedback_type TEXT CHECK(feedback_type IN ('discomfort', 'safe')) NOT NULL,
    allergens_present TEXT DEFAULT '[]',               -- JSON array of allergens in the scanned product
    product_name TEXT,                                 -- what product was scanned
    ingredient_text TEXT,                              -- raw ingredient text
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_suspected_allergies_user ON suspected_allergies(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_feedback_user ON scan_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_feedback_type ON scan_feedback(feedback_type);
