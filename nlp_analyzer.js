// ============================================================
// AAHAR-AI — NLP Ingredient Analyzer
// AI-based Allergen Assessment, Health Analysis and Recommendation System
// Fine-tuned on Gemini with personalized analysis
// Falls back to client-side keyword matching if API unavailable
// ============================================================

// ── Configuration ──────────────────────────────────────────
// API key is stored in localStorage via the Profile panel.
// Open "My Profile" → set your Gemini API key there.
// Get a free key at: https://aistudio.google.com/apikey
const GEMINI_MODEL = 'gemini-2.0-flash';

function getGeminiUrl() {
  const key = getApiKey(); // from profile.js
  return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
}

// ── Allergen Database (for fallback keyword matching) ──────
const ALLERGEN_DB = {
  'Milk': {
    keywords: ['milk', 'lactose', 'casein', 'caseinate', 'whey', 'cream', 'butter', 'ghee', 'cheese', 'curd', 'yogurt', 'yoghurt', 'buttermilk', 'cheddar', 'mozzarella', 'feta', 'parmesan', 'ice cream', 'gelato', 'sherbet', 'condensed milk', 'evaporated milk', 'milk powder', 'lactalbumin', 'lactoglobulin', 'galactose', 'paneer', 'khoa', 'khoya'],
    icon: '🥛'
  },
  'Eggs': {
    keywords: ['egg', 'eggs', 'albumin', 'globulin', 'lysozyme', 'mayonnaise', 'meringue', 'ovalbumin', 'ovomucin', 'ovomucoid', 'ovovitellin', 'surimi'],
    icon: '🥚'
  },
  'Peanuts': {
    keywords: ['peanut', 'peanuts', 'groundnut', 'groundnuts', 'arachis', 'beer nuts', 'monkey nuts', 'nut meat', 'peanut butter', 'peanut flour', 'peanut oil'],
    icon: '🥜'
  },
  'Tree Nuts': {
    keywords: ['almond', 'almonds', 'cashew', 'cashews', 'walnut', 'walnuts', 'pecan', 'pecans', 'pistachio', 'pistachios', 'hazelnut', 'hazelnuts', 'filbert', 'macadamia', 'brazil nut', 'brazil nuts', 'pine nut', 'pine nuts', 'chestnut', 'chestnuts', 'praline', 'marzipan', 'nougat', 'gianduja'],
    icon: '🌰'
  },
  'Wheat / Gluten': {
    keywords: ['wheat', 'gluten', 'flour', 'bread', 'semolina', 'bulgur', 'couscous', 'durum', 'einkorn', 'emmer', 'farina', 'kamut', 'spelt', 'triticale', 'malt', 'malt extract', 'malt vinegar', 'barley', 'rye', 'seitan', 'wheat starch', 'wheat bran', 'wheat germ', 'hydrolyzed wheat protein', 'maltodextrin', 'atta', 'maida', 'suji', 'rava'],
    icon: '🌾'
  },
  'Soy': {
    keywords: ['soy', 'soya', 'soybean', 'soybeans', 'soy lecithin', 'soy protein', 'soy sauce', 'edamame', 'miso', 'tempeh', 'tofu', 'textured vegetable protein', 'tvp', 'soy flour', 'soy milk', 'soy oil'],
    icon: '🫘'
  },
  'Fish': {
    keywords: ['fish', 'cod', 'salmon', 'tuna', 'anchovy', 'anchovies', 'sardine', 'sardines', 'bass', 'catfish', 'flounder', 'haddock', 'halibut', 'herring', 'mackerel', 'perch', 'pike', 'pollock', 'snapper', 'sole', 'swordfish', 'tilapia', 'trout', 'fish sauce', 'fish oil', 'surimi', 'worcestershire'],
    icon: '🐟'
  },
  'Shellfish': {
    keywords: ['shrimp', 'lobster', 'crab', 'crayfish', 'crawfish', 'prawn', 'prawns', 'clam', 'clams', 'mussel', 'mussels', 'oyster', 'oysters', 'scallop', 'scallops', 'squid', 'calamari', 'octopus', 'snail', 'escargot', 'abalone', 'langoustine'],
    icon: '🦐'
  },
  'Sesame': {
    keywords: ['sesame', 'sesame seeds', 'sesame oil', 'tahini', 'halvah', 'hummus', 'til', 'gingelly'],
    icon: '⚪'
  }
};

// ── OCR: Extract text from image using Tesseract.js ────────
async function extractWithOCR(imageData) {
  showLoading('Reading ingredient label with OCR...');

  try {
    const result = await Tesseract.recognize(imageData, 'eng', {
      logger: m => {
        if (m.status === 'recognizing text') {
          updateLoadingProgress(Math.round(m.progress * 100));
        }
      }
    });

    const text = result.data.text.trim();
    if (!text) {
      throw new Error('No text detected in the image. Please try again with a clearer photo of the ingredient label.');
    }
    return text;
  } catch (error) {
    if (error.message.includes('No text detected')) throw error;
    throw new Error('OCR failed: ' + error.message);
  }
}

// ── Risk Scoring: Risk = Confidence × Severity Weight ──────
function computeRiskScores(analysis) {
  const profile = getProfile();
  const userAllergies = profile.allergies || [];

  const CONFIDENCE_MAP = { definite: 1.0, likely: 0.8, possible: 0.4 };

  if (analysis.allergens && analysis.allergens.length > 0) {
    let maxRisk = 0;
    analysis.allergens.forEach(a => {
      const confidence = CONFIDENCE_MAP[a.risk] || 0.5;
      // Find matching user allergy
      const userMatch = userAllergies.find(ua =>
        a.name.toLowerCase().includes(ua.allergen.toLowerCase().split('/')[0].trim().split(' ')[0].toLowerCase())
      );
      const sevWeight = userMatch ? getSeverityWeight(userMatch.severity) : 0.5;
      a.riskScore = +(confidence * sevWeight).toFixed(2);
      if (a.riskScore > maxRisk) maxRisk = a.riskScore;

      // Add risk info to personal note if user has this allergy
      if (userMatch && !a.personalNote) {
        a.personalNote = `⚠️ CRITICAL — Matches your ${userMatch.severity} severity ${userMatch.allergen} allergy! Risk: ${(a.riskScore * 100).toFixed(0)}%`;
      }
    });
    analysis.overallRiskScore = maxRisk;
  } else {
    analysis.overallRiskScore = 0;
  }

  // Apply sensitivity level filtering
  if (profile.sensitivityLevel === 'mild') {
    // Only keep definite allergens that match user's known allergies
    analysis.allergens = (analysis.allergens || []).filter(a =>
      a.risk === 'definite' || a.riskScore >= 0.6
    );
  } else if (profile.sensitivityLevel === 'strict') {
    // Keep everything — even trace/possible risks
    // No filtering needed
  }
  // 'moderate' is default — keep definite and likely, filter out very low
  else {
    analysis.allergens = (analysis.allergens || []).filter(a =>
      a.risk !== 'possible' || a.riskScore >= 0.3
    );
  }
}

// ── NLP: Backend-powered analysis (Gemini on server) ────────
async function analyzeWithGemini(ingredientText) {
  showLoading('Analyzing ingredients with AI (personalized for you)...');

  // Build user profile for the backend
  const profile = getProfile(); // from profile.js

  try {
    const response = await fetch('/api/scan/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: ingredientText,
        userProfile: {
          name: profile.name || 'User',
          allergies: profile.allergies || [],
          sensitivityLevel: profile.sensitivityLevel || 'moderate',
          dietPreferences: profile.dietPreferences || [],
          medicalConditions: profile.medicalConditions || [],
          customAllergens: profile.customAllergens || []
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('Backend scan error:', errData);
      console.warn('Falling back to keyword matching...');
      return analyzeWithKeywords(ingredientText);
    }

    const analysis = await response.json();
    if (!analysis._source) analysis._source = 'gemini';
    // Apply client-side risk scoring
    computeRiskScores(analysis);
    return analysis;

  } catch (error) {
    console.error('Backend analysis failed:', error);
    console.warn('Falling back to keyword matching...');
    return analyzeWithKeywords(ingredientText);
  }
}

// ── Fallback: Client-side keyword matching ─────────────────
function analyzeWithKeywords(ingredientText) {
  const lowerText = ingredientText.toLowerCase();
  const allergens = [];
  const found = new Set();
  const profile = getProfile();

  for (const [allergenName, allergenInfo] of Object.entries(ALLERGEN_DB)) {
    const triggers = [];
    for (const keyword of allergenInfo.keywords) {
      if (lowerText.includes(keyword)) {
        triggers.push(keyword);
      }
    }
    if (triggers.length > 0) {
      found.add(allergenName);
      // Check if this matches user's known allergies and get severity
      const userAllergy = (profile.allergies || []).find(a =>
        allergenName.toLowerCase().includes(a.allergen.toLowerCase().split(' ')[0])
      );
      const confidence = triggers.length > 3 ? 1.0 : triggers.length > 1 ? 0.9 : 0.8;
      const sevWeight = userAllergy ? getSeverityWeight(userAllergy.severity) : 0.5;
      const riskScore = +(confidence * sevWeight).toFixed(2);
      allergens.push({
        name: allergenName,
        risk: 'definite',
        triggers: [...new Set(triggers)],
        explanation: `Found keyword(s): ${[...new Set(triggers)].join(', ')}`,
        personalNote: userAllergy ? `⚠️ CRITICAL — Matches your ${userAllergy.severity} severity ${userAllergy.allergen} allergy! Risk score: ${(riskScore * 100).toFixed(0)}%` : '',
        riskScore
      });
    }
  }

  // Check custom allergens
  if (profile.customAllergens) {
    for (const custom of profile.customAllergens) {
      if (lowerText.includes(custom.toLowerCase())) {
        allergens.push({
          name: custom,
          risk: 'definite',
          triggers: [custom],
          explanation: `Custom allergen "${custom}" found in ingredients`,
          personalNote: '⚠️ This is YOUR custom allergen!'
        });
      }
    }
  }

  // Check for ambiguous ingredients
  const ambiguous = ['natural flavors', 'natural flavours', 'artificial flavors', 'artificial flavours', 'spices', 'seasoning', 'modified starch', 'modified food starch', 'hydrolyzed protein', 'lecithin', 'emulsifier', 'stabilizer', 'thickener'];
  const ambiguousFound = ambiguous.filter(a => lowerText.includes(a));
  if (ambiguousFound.length > 0) {
    allergens.push({
      name: 'Unknown / Ambiguous',
      risk: 'possible',
      triggers: ambiguousFound,
      explanation: 'These ingredients may contain hidden allergens. Check with the manufacturer.',
      personalNote: ''
    });
  }

  const safeFor = Object.keys(ALLERGEN_DB).filter(a => !found.has(a));
  const userName = profile.name || 'there';

  const result = {
    productSummary: 'Product analyzed using keyword matching (set up your Gemini API key in My Profile for AI-powered analysis)',
    personalizedSummary: allergens.length > 0
      ? `Hey ${userName}, we found ${allergens.filter(a => a.risk === 'definite').length} allergen(s) in this product. ${allergens.some(a => a.personalNote) ? 'Some of these match YOUR known allergies — please be careful!' : 'Review the details below to see if any affect you.'}`
      : `Hey ${userName}, no common allergens detected! Always double-check with the manufacturer to be safe.`,
    allergens: allergens,
    safeFor: safeFor,
    dietaryFlags: [],
    healthWarnings: [],
    summary: allergens.length > 0
      ? `Found ${allergens.filter(a => a.risk === 'definite').length} definite allergen(s) and ${allergens.filter(a => a.risk !== 'definite').length} possible concern(s).`
      : 'No common allergens detected in the ingredient list.',
    _source: 'fallback'
  };
  // Apply risk scoring
  computeRiskScores(result);
  return result;
}

// ── Display Results ────────────────────────────────────────
function displayResults(analysis, rawText) {
  const panel = document.getElementById('nlp-results');
  if (!panel) return;

  hideLoading();

  // Save to scan history
  try {
    addToScanHistory(rawText || document.getElementById('ingredient-textarea')?.value || '', analysis);
  } catch (e) {
    console.warn('Could not save to scan history:', e);
  }

  const sourceLabel = analysis._source === 'gemini' || analysis._source === 'gemini-vision'
    ? '<span class="source-badge ai">✨ AI-Powered Personalized Analysis</span>'
    : '<span class="source-badge fallback">🔍 Keyword Analysis</span>';

  // Personalized summary (the 2-3 line output)
  const personalizedHTML = analysis.personalizedSummary
    ? `<div class="personalized-summary">
        <span class="for-you-label">🎯 PERSONALIZED FOR YOU</span>
        <p>${analysis.personalizedSummary}</p>
      </div>`
    : '';

  const allergensHTML = analysis.allergens.length > 0
    ? analysis.allergens.map(a => {
      const riskClass = a.risk === 'definite' ? 'risk-high' : a.risk === 'likely' ? 'risk-medium' : 'risk-low';
      const riskIcon = a.risk === 'definite' ? '🔴' : a.risk === 'likely' ? '🟠' : '🟡';
      const allergenIcon = ALLERGEN_DB[a.name]?.icon || '⚠️';
      const personalNote = a.personalNote
        ? `<p class="allergen-personal-note">${a.personalNote}</p>` : '';
      return `
          <div class="allergen-card ${riskClass}">
            <div class="allergen-header">
              <span class="allergen-icon">${allergenIcon}</span>
              <strong>${a.name}</strong>
              <span class="risk-badge ${riskClass}">${riskIcon} ${a.risk.toUpperCase()}</span>
            </div>
            <div class="allergen-triggers">
              ${a.triggers.map(t => `<span class="trigger-tag">${t}</span>`).join('')}
            </div>
            <p class="allergen-explanation">${a.explanation}</p>
            ${personalNote}
          </div>`;
    }).join('')
    : '<div class="no-allergens">✅ No common allergens detected!</div>';

  const safeHTML = analysis.safeFor && analysis.safeFor.length > 0
    ? `<div class="safe-section">
        <h4>✅ Appears Safe For</h4>
        <div class="safe-tags">
          ${analysis.safeFor.map(s => {
      const icon = ALLERGEN_DB[s]?.icon || '✅';
      return `<span class="safe-tag">${icon} ${s}</span>`;
    }).join('')}
        </div>
      </div>`
    : '';

  // Dietary flags
  const dietaryHTML = analysis.dietaryFlags && analysis.dietaryFlags.length > 0
    ? `<div class="dietary-flags-section">
        <h4>🥗 Dietary Flags</h4>
        ${analysis.dietaryFlags.map(f => `<div class="dietary-flag">${f}</div>`).join('')}
      </div>`
    : '';

  // Health warnings
  const healthHTML = analysis.healthWarnings && analysis.healthWarnings.length > 0
    ? `<div class="health-warnings-section">
        <h4>🏥 Health Warnings</h4>
        ${analysis.healthWarnings.map(w => `<div class="health-warning">${w}</div>`).join('')}
      </div>`
    : '';

  // ── Nutrition Intelligence Engine sections ──
  // Health Score Gauge
  const healthScore = analysis.health_score || 0;
  const healthStatus = analysis.health_status || '';
  const scoreColor = healthScore >= 80 ? '#10b981' : healthScore >= 60 ? '#f59e0b' : healthScore >= 40 ? '#f97316' : '#ef4444';
  const scoreRing = (healthScore / 100) * 283; // SVG circle circumference

  const healthScoreHTML = (analysis._source === 'gemini' || analysis._source === 'gemini-vision') && healthScore > 0
    ? `<div class="nutrition-health-score-card">
        <div class="health-score-gauge">
          <svg viewBox="0 0 100 100" class="score-ring">
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="8"/>
            <circle cx="50" cy="50" r="45" fill="none" stroke="${scoreColor}" stroke-width="8"
              stroke-dasharray="${scoreRing} 283" stroke-linecap="round"
              transform="rotate(-90 50 50)" class="score-ring-fill"/>
          </svg>
          <div class="score-number" style="color:${scoreColor}">${healthScore}</div>
          <div class="score-label">Health Score</div>
        </div>
        <div class="health-score-info">
          <div class="health-status-badge" style="background:${scoreColor}20;color:${scoreColor};border:1px solid ${scoreColor}40">
            ${healthScore >= 80 ? '🌟' : healthScore >= 60 ? '⚡' : healthScore >= 40 ? '⚠️' : '🚨'} ${healthStatus}
          </div>
          ${analysis.consumption_recommendation ? `
          <div class="consumption-badge">
            <span class="consumption-level">${analysis.consumption_recommendation.level}</span>
            <span class="consumption-freq">📅 ${analysis.consumption_recommendation.frequency}</span>
          </div>
          <p class="consumption-reason">${analysis.consumption_recommendation.reason || ''}</p>` : ''}
        </div>
      </div>`
    : '';

  // Nutrition Analysis Grid
  const nutritionHTML = analysis.nutrition_analysis
    ? `<div class="nutrition-analysis-section">
        <h4>📊 Nutritional Breakdown</h4>
        <div class="nutrition-grid">
          ${Object.entries(analysis.nutrition_analysis).map(([key, val]) => {
            if (!val || !val.category) return '';
            const catClass = val.category === 'GOOD' ? 'nut-good' : val.category === 'RISK' ? 'nut-risk' : 'nut-moderate';
            const catIcon = val.category === 'GOOD' ? '✅' : val.category === 'RISK' ? '🔴' : '🟡';
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            return `<div class="nutrition-item ${catClass}">
              <div class="nut-label">${label}</div>
              <div class="nut-level">${catIcon} ${val.level || ''}</div>
              <span class="nut-category-badge ${catClass}">${val.category}</span>
              ${val.detail ? `<div class="nut-detail">${val.detail}</div>` : ''}
              ${val.value ? `<div class="nut-value">${val.value}</div>` : ''}
            </div>`;
          }).join('')}
        </div>
      </div>`
    : '';

  // Additive Analysis
  const additivesHTML = analysis.additive_analysis && analysis.additive_analysis.length > 0
    ? `<div class="additive-analysis-section">
        <h4>🧪 Additive & Ingredient Risk Analysis</h4>
        <div class="additive-list">
          ${analysis.additive_analysis.map(a => {
            const impactClass = a.impact === 'safe' ? 'add-safe' : a.impact === 'harmful' ? 'add-harmful' : 'add-caution';
            const impactIcon = a.impact === 'safe' ? '✅' : a.impact === 'harmful' ? '🚫' : '⚠️';
            return `<div class="additive-item ${impactClass}">
              <div class="additive-header">
                <strong>${a.name}</strong>
                ${a.fullName ? `<span class="additive-fullname">${a.fullName}</span>` : ''}
                <span class="additive-impact ${impactClass}">${impactIcon} ${a.impact.toUpperCase()}</span>
              </div>
              ${a.explanation ? `<p class="additive-explanation">${a.explanation}</p>` : ''}
            </div>`;
          }).join('')}
        </div>
      </div>`
    : '';

  // Health Score Breakdown
  const breakdownHTML = analysis.health_score_breakdown
    ? `<div class="score-breakdown-section">
        <h4>📋 Score Breakdown</h4>
        <div class="breakdown-items">
          <div class="breakdown-base">Base Score: <strong>100</strong></div>
          ${(analysis.health_score_breakdown.penalties || []).map(p =>
            `<div class="breakdown-penalty">❌ ${p.reason} <span>${p.points}</span></div>`
          ).join('')}
          ${(analysis.health_score_breakdown.bonuses || []).map(b =>
            `<div class="breakdown-bonus">✅ ${b.reason} <span>+${b.points}</span></div>`
          ).join('')}
          <div class="breakdown-total" style="color:${scoreColor}">Final Score: <strong>${healthScore}</strong>/100</div>
        </div>
      </div>`
    : '';

  // Suggestions
  const suggestionsHTML = analysis.suggestions && analysis.suggestions.length > 0
    ? `<div class="suggestions-section">
        <h4>💡 Personalized Suggestions</h4>
        <div class="suggestion-cards">
          ${analysis.suggestions.map((s, i) => {
            const icons = ['🎯', '🔄', '🥗', '💪', '🏃', '⏰'];
            return `<div class="suggestion-card">
              <span class="suggestion-icon">${icons[i % icons.length]}</span>
              <p>${s}</p>
            </div>`;
          }).join('')}
        </div>
      </div>`
    : '';

  // ── Adaptive Intelligence sections ──
  // General Safety Warning (for users with no profile)
  const generalWarningHTML = analysis.general_warning
    ? `<div class="adaptive-general-warning">
        <div class="warning-icon">⚠️</div>
        <div class="warning-content">
          <h4>General Safety Alert</h4>
          <p>${analysis.general_warning}</p>
          <p class="warning-hint">💡 Set up your allergen profile in <strong>My Profile</strong> for personalized risk assessments.</p>
        </div>
      </div>`
    : '';

  // Adaptive Insights (suspected allergies from learning)
  const adaptiveInsightsHTML = analysis.adaptive_insights && analysis.adaptive_insights.length > 0
    ? `<div class="adaptive-insights-section">
        <h4>🧠 Adaptive Intelligence Insights</h4>
        <p class="adaptive-subtitle">Learned from your feedback history</p>
        <div class="adaptive-cards">
          ${analysis.adaptive_insights.map(insight => {
            const pct = Math.round(insight.confidence * 100);
            const barColor = insight.status === 'probable' ? '#ef4444' : insight.status === 'suspected' ? '#f59e0b' : '#6366f1';
            const statusIcon = insight.status === 'probable' ? '🔴' : insight.status === 'suspected' ? '🟠' : '🟡';
            const trendIcon = insight.trend === 'increasing' ? '📈' : insight.trend === 'decreasing' ? '📉' : '➡️';
            return `<div class="adaptive-card" style="border-left: 3px solid ${barColor}">
              <div class="adaptive-card-header">
                <span>${statusIcon} ${insight.allergen.charAt(0).toUpperCase() + insight.allergen.slice(1)}</span>
                <span class="adaptive-status">${insight.status.toUpperCase()} ${trendIcon}</span>
              </div>
              <div class="adaptive-confidence-bar">
                <div class="adaptive-bar-fill" style="width: ${pct}%; background: ${barColor}"></div>
              </div>
              <div class="adaptive-confidence-label">${pct}% confidence · ${insight.negativeReports} reports</div>
              <p class="adaptive-message">${insight.message}</p>
              ${insight.relatedProducts && insight.relatedProducts.length > 0
                ? `<div class="adaptive-related">Related products: ${insight.relatedProducts.join(', ')}</div>` : ''}
            </div>`;
          }).join('')}
        </div>
      </div>`
    : '';

  // Suspected allergies summary (from adaptive learning)
  const suspectedHTML = analysis.suspected_allergies && analysis.suspected_allergies.length > 0
    ? `<div class="suspected-allergies-section">
        <h4>🔍 Suspected Sensitivities</h4>
        <div class="suspected-tags">
          ${analysis.suspected_allergies.map(s => {
            const pct = Math.round(s.confidence * 100);
            const cls = s.status === 'probable' ? 'suspected-high' : s.status === 'suspected' ? 'suspected-med' : 'suspected-low';
            return `<span class="suspected-tag ${cls}" title="${s.status}: ${pct}% confidence">
              ${s.name} (${pct}%)
            </span>`;
          }).join('')}
        </div>
      </div>`
    : '';

  // Feedback buttons for adaptive learning
  const feedbackHTML = `<div class="adaptive-feedback-section">
    <h4>📝 How did this product make you feel?</h4>
    <p class="feedback-subtitle">Your feedback helps AAHAR-AI learn your sensitivities over time</p>
    <div class="feedback-buttons">
      <button class="feedback-btn feedback-safe" onclick="submitAdaptiveFeedback('safe')">
        ✅ I felt fine
      </button>
      <button class="feedback-btn feedback-discomfort" onclick="submitAdaptiveFeedback('discomfort')">
        ⚠️ I felt discomfort
      </button>
    </div>
    <div id="feedback-result" class="feedback-result" style="display:none"></div>
  </div>`;

  panel.innerHTML = `
    <div class="results-container">
      <div class="results-header">
        <h3>🔬 Analysis Results</h3>
        ${sourceLabel}
      </div>
      ${analysis.productSummary ? `<p class="product-summary">${analysis.productSummary}</p>` : ''}
      
      ${generalWarningHTML}
      ${personalizedHTML}

      ${healthScoreHTML}

      ${rawText ? `
      <div class="ocr-text-section">
        <h4>📝 Detected Ingredient Text</h4>
        <div class="ocr-text-box">${rawText}</div>
      </div>` : ''}

      <div class="summary-box">
        <p>${analysis.summary}</p>
      </div>

      <div class="allergens-section">
        <h4>⚠️ Allergens Found</h4>
        ${allergensHTML}
      </div>

      ${nutritionHTML}
      ${additivesHTML}
      ${breakdownHTML}

      ${dietaryHTML}
      ${healthHTML}
      ${safeHTML}

      ${suggestionsHTML}

      ${adaptiveInsightsHTML}
      ${suspectedHTML}

      ${feedbackHTML}

      <div class="results-actions">
        <button id="speak-results-btn" class="action-btn speak-btn" onclick="speakResults()">
          🔊 Read Aloud
        </button>
        <button class="action-btn clear-btn" onclick="clearResults()">
          ✖ Clear
        </button>
      </div>
    </div>
  `;

  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Store for TTS
  window._lastAnalysis = analysis;
}

// ── Text-to-Speech ─────────────────────────────────────────
function speakResults() {
  const analysis = window._lastAnalysis;
  if (!analysis) return;

  window.speechSynthesis.cancel();

  // Speak the personalized summary first
  let text = '';
  if (analysis.personalizedSummary) {
    text = analysis.personalizedSummary + '. ';
  } else {
    text = analysis.summary + '. ';
  }

  if (analysis.allergens.length > 0) {
    text += 'Allergens detected: ';
    text += analysis.allergens.map(a => `${a.name}, risk level ${a.risk}`).join('. ') + '. ';
  }

  // Speak health score and consumption recommendation
  if (analysis.health_score) {
    text += `Health score: ${analysis.health_score} out of 100. Status: ${analysis.health_status || 'Unknown'}. `;
  }
  if (analysis.consumption_recommendation) {
    text += `Consumption level: ${analysis.consumption_recommendation.level}. Frequency: ${analysis.consumption_recommendation.frequency}. `;
  }

  if (analysis.healthWarnings && analysis.healthWarnings.length > 0) {
    text += 'Health warnings: ' + analysis.healthWarnings.join('. ') + '. ';
  }

  // Speak suggestions
  if (analysis.suggestions && analysis.suggestions.length > 0) {
    text += 'Suggestions: ' + analysis.suggestions.join('. ') + '. ';
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.85;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

// ── Adaptive Feedback Submission ───────────────────────────
async function submitAdaptiveFeedback(feedbackType) {
  const analysis = window._lastAnalysis;
  if (!analysis) return;

  const profile = getProfile();
  const userId = getCurrentSession() || profile.name || 'anonymous';

  // Extract ALL detected allergens from the analysis
  const sourceArray = analysis.allDetectedAllergens || analysis.allergens || [];
  const allergensPresent = sourceArray.map(a => a.name || a.allergen || '');
  
  // Also include general_warning allergens if present
  if (analysis.general_warning_allergens) {
    allergensPresent.push(...analysis.general_warning_allergens);
  }

  const resultDiv = document.getElementById('feedback-result');

  try {
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        feedbackType,
        allergensPresent: [...new Set(allergensPresent)],
        productName: analysis.productName || analysis.productSummary || '',
        ingredientText: analysis.ingredientText || '',
        scanId: analysis.scanId || null
      })
    });

    const data = await response.json();

    if (data.success) {
      // Disable feedback buttons
      const buttons = document.querySelectorAll('.feedback-btn');
      buttons.forEach(btn => { btn.disabled = true; btn.style.opacity = '0.5'; });

      // Show result
      if (resultDiv) {
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = `<p>${data.message}</p>`;

        // Show any new adaptive insights
        if (data.adaptive_insights && data.adaptive_insights.length > 0) {
          resultDiv.innerHTML += `<div class="feedback-insights">
            <strong>🧠 Updated Insights:</strong>
            ${data.adaptive_insights.map(i => `<p>${i.message}</p>`).join('')}
          </div>`;
        }
      }
    }
  } catch (err) {
    console.error('Feedback submission failed:', err);
    if (resultDiv) {
      resultDiv.style.display = 'block';
      resultDiv.innerHTML = '<p>⚠️ Could not send feedback. Please try again.</p>';
    }
  }
}

// ── Clear Results ──────────────────────────────────────────
function clearResults() {
  const panel = document.getElementById('nlp-results');
  if (panel) {
    panel.innerHTML = '';
    panel.style.display = 'none';
  }
  window._lastAnalysis = null;
  window.speechSynthesis.cancel();
}

// ── Loading UI ─────────────────────────────────────────────
function showLoading(message) {
  const panel = document.getElementById('nlp-results');
  if (!panel) return;
  panel.style.display = 'block';
  panel.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">${message}</p>
      <div class="loading-progress" id="loading-progress" style="display:none;">
        <div class="loading-progress-bar" id="loading-progress-bar"></div>
      </div>
    </div>
  `;
}

function updateLoadingProgress(percent) {
  const progress = document.getElementById('loading-progress');
  const bar = document.getElementById('loading-progress-bar');
  if (progress && bar) {
    progress.style.display = 'block';
    bar.style.width = percent + '%';
  }
}

function hideLoading() {
  // Results will replace loading content
}

// ── Main entry points (called from script.js) ─────────────

// Analyze text input directly
async function analyzeIngredientText(text) {
  if (!text || !text.trim()) {
    alert('Please enter or paste an ingredient list.');
    return;
  }
  try {
    const analysis = await analyzeWithGemini(text.trim());
    displayResults(analysis, null);
  } catch (err) {
    hideLoading();
    alert('Analysis failed: ' + err.message);
  }
}

// Analyze an image captured from the webcam (OCR mode → backend)
async function analyzeIngredientImage(imageData) {
  showLoading('Sending image to server for analysis...');
  const profile = getProfile();

  try {
    const response = await fetch('/api/scan/image-base64', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageData: imageData,
        scanType: 'ocr',
        userProfile: {
          name: profile.name || 'User',
          allergies: profile.allergies || [],
          sensitivityLevel: profile.sensitivityLevel || 'moderate',
          dietPreferences: profile.dietPreferences || [],
          medicalConditions: profile.medicalConditions || [],
          customAllergens: profile.customAllergens || []
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Server analysis failed');
    }

    const analysis = await response.json();
    if (!analysis._source) analysis._source = 'gemini';
    computeRiskScores(analysis);
    displayResults(analysis, analysis._ocrText || null);
  } catch (err) {
    // Fallback: client-side OCR + keyword matching
    console.warn('Backend image scan failed, falling back to client-side OCR:', err.message);
    try {
      const text = await extractWithOCR(imageData);
      const analysis = analyzeWithKeywords(text);
      displayResults(analysis, text);
    } catch (e2) {
      hideLoading();
      alert('Analysis failed: ' + e2.message);
    }
  }
}

// Analyze a product image (Gemini Vision via backend)
async function analyzeProductImage(imageData) {
  showLoading('Identifying product with AI vision...');
  const profile = getProfile();

  try {
    const response = await fetch('/api/scan/image-base64', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageData: imageData,
        scanType: 'product',
        userProfile: {
          name: profile.name || 'User',
          allergies: profile.allergies || [],
          sensitivityLevel: profile.sensitivityLevel || 'moderate',
          dietPreferences: profile.dietPreferences || [],
          medicalConditions: profile.medicalConditions || [],
          customAllergens: profile.customAllergens || []
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('Backend product scan error:', errData);
      // Fallback to OCR
      showLoading('Product identification failed. Trying OCR...');
      return analyzeIngredientImage(imageData);
    }

    const analysis = await response.json();
    if (!analysis._source) analysis._source = 'gemini-vision';
    computeRiskScores(analysis);
    displayResults(analysis, analysis.identifiedIngredients || null);

  } catch (error) {
    console.error('Product analysis failed:', error);
    showLoading('Product identification failed. Trying OCR...');
    try {
      await analyzeIngredientImage(imageData);
    } catch (e2) {
      hideLoading();
      alert('Analysis failed: ' + e2.message);
    }
  }
}
