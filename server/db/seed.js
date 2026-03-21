// ============================================================
// AAHAR-AI — Database Seed Script
// Seeds the allergens table with Big 9 + extended allergens
// Run: node db/seed.js
// ============================================================
const { getDb, closeDb } = require('./db');

function seed() {
    const db = getDb();

    const allergens = [
        { name: 'Milk', category: 'common', icon: '🥛', keywords: ['milk','lactose','casein','caseinate','whey','cream','butter','ghee','cheese','curd','yogurt','yoghurt','buttermilk','ice cream','gelato','condensed milk','evaporated milk','milk powder','lactalbumin','lactoglobulin','paneer','khoa','khoya'] },
        { name: 'Eggs', category: 'common', icon: '🥚', keywords: ['egg','eggs','albumin','globulin','lysozyme','mayonnaise','meringue','ovalbumin','ovomucin','ovomucoid','surimi'] },
        { name: 'Peanuts', category: 'common', icon: '🥜', keywords: ['peanut','peanuts','groundnut','groundnuts','arachis','beer nuts','monkey nuts','peanut butter','peanut flour','peanut oil'] },
        { name: 'Tree Nuts', category: 'common', icon: '🌰', keywords: ['almond','almonds','cashew','cashews','walnut','walnuts','pecan','pecans','pistachio','pistachios','hazelnut','hazelnuts','macadamia','brazil nut','pine nut','chestnut','praline','marzipan','nougat'] },
        { name: 'Wheat / Gluten', category: 'common', icon: '🌾', keywords: ['wheat','gluten','flour','bread','semolina','bulgur','couscous','durum','farina','spelt','triticale','malt','barley','rye','seitan','wheat starch','wheat bran','wheat germ','atta','maida','suji','rava','maltodextrin'] },
        { name: 'Soy', category: 'common', icon: '🫘', keywords: ['soy','soya','soybean','soybeans','soy lecithin','soy protein','soy sauce','edamame','miso','tempeh','tofu','tvp','soy flour','soy milk','soy oil'] },
        { name: 'Fish', category: 'common', icon: '🐟', keywords: ['fish','cod','salmon','tuna','anchovy','anchovies','sardine','sardines','bass','catfish','halibut','herring','mackerel','trout','fish sauce','fish oil','worcestershire'] },
        { name: 'Shellfish', category: 'common', icon: '🦐', keywords: ['shrimp','lobster','crab','crayfish','prawn','prawns','clam','mussel','oyster','scallop','squid','calamari','octopus','abalone'] },
        { name: 'Sesame', category: 'common', icon: '⚪', keywords: ['sesame','sesame seeds','sesame oil','tahini','halvah','hummus','til','gingelly'] }
    ];

    const insertAllergen = db.prepare(`
        INSERT OR IGNORE INTO allergens (name, category, icon, keywords)
        VALUES (?, ?, ?, ?)
    `);

    const insertMany = db.transaction((items) => {
        for (const a of items) {
            insertAllergen.run(a.name, a.category, a.icon, JSON.stringify(a.keywords));
        }
    });

    insertMany(allergens);
    console.log(`✅ Seeded ${allergens.length} allergens`);

    // Seed some common ingredients and their allergen mappings
    const commonIngredients = [
        { name: 'Wheat Flour', allergen: 'Wheat / Gluten', confidence: 1.0, risk: 'definite' },
        { name: 'Milk Powder', allergen: 'Milk', confidence: 1.0, risk: 'definite' },
        { name: 'Whey Protein', allergen: 'Milk', confidence: 0.95, risk: 'definite' },
        { name: 'Soy Lecithin', allergen: 'Soy', confidence: 0.85, risk: 'likely' },
        { name: 'Egg White', allergen: 'Eggs', confidence: 1.0, risk: 'definite' },
        { name: 'Peanut Oil', allergen: 'Peanuts', confidence: 0.9, risk: 'definite' },
        { name: 'Cashew', allergen: 'Tree Nuts', confidence: 1.0, risk: 'definite' },
        { name: 'Fish Sauce', allergen: 'Fish', confidence: 1.0, risk: 'definite' },
        { name: 'Shrimp Paste', allergen: 'Shellfish', confidence: 1.0, risk: 'definite' },
        { name: 'Tahini', allergen: 'Sesame', confidence: 1.0, risk: 'definite' },
        { name: 'Natural Flavors', allergen: 'Unknown / Ambiguous', confidence: 0.3, risk: 'possible' },
        { name: 'Modified Food Starch', allergen: 'Wheat / Gluten', confidence: 0.4, risk: 'possible' },
    ];

    const insertIngredient = db.prepare(`INSERT OR IGNORE INTO ingredients (name, normalized_name) VALUES (?, ?)`);
    const getIngredientId = db.prepare(`SELECT id FROM ingredients WHERE normalized_name = ?`);
    const getAllergenId = db.prepare(`SELECT id FROM allergens WHERE name = ?`);
    const insertMapping = db.prepare(`
        INSERT OR IGNORE INTO ingredient_allergens (ingredient_id, allergen_id, confidence_score, risk_level, source)
        VALUES (?, ?, ?, ?, 'system')
    `);

    const seedIngredients = db.transaction((items) => {
        for (const item of items) {
            const normalized = item.name.toLowerCase().trim();
            insertIngredient.run(item.name, normalized);
            const ing = getIngredientId.get(normalized);
            const alg = getAllergenId.get(item.allergen);
            if (ing && alg) {
                insertMapping.run(ing.id, alg.id, item.confidence, item.risk);
            }
        }
    });

    seedIngredients(commonIngredients);
    console.log(`✅ Seeded ${commonIngredients.length} ingredient-allergen mappings`);

    closeDb();
    console.log('🎉 Database seeding complete!');
}

seed();
