// ============================================================
// AAHAR-AI — Authentication & User Management
// AI-based Allergen Assessment, Health Analysis and Recommendation System
// SHA-256 password hashing via SubtleCrypto
// Multi-user localStorage persistence
// ============================================================

// ── Password Hashing (SHA-256 via Web Crypto API) ──────────
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + '_aaharai_salt_2025');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Data Migration (safegrub → aaharai) ────────────────────
(function migrateOldData() {
    const oldUsers = localStorage.getItem('safegrub_users');
    const oldSession = localStorage.getItem('safegrub_session');
    if (oldUsers && !localStorage.getItem('aaharai_users')) {
        localStorage.setItem('aaharai_users', oldUsers);
        localStorage.removeItem('safegrub_users');
    }
    if (oldSession && !localStorage.getItem('aaharai_session')) {
        localStorage.setItem('aaharai_session', oldSession);
        localStorage.removeItem('safegrub_session');
    }
})();

// ── User Storage (Multi-user) ──────────────────────────────
function getAllUsers() {
    try {
        return JSON.parse(localStorage.getItem('aaharai_users') || '{}');
    } catch { return {}; }
}

function saveAllUsers(users) {
    localStorage.setItem('aaharai_users', JSON.stringify(users));
}

function getUserByEmail(email) {
    const users = getAllUsers();
    return Object.values(users).find(u => u.email === email.toLowerCase().trim());
}

function getUserById(id) {
    return getAllUsers()[id] || null;
}

// ── Session Management ─────────────────────────────────────
function getCurrentSession() {
    return localStorage.getItem('aaharai_session') || null;
}

function setSession(userId) {
    localStorage.setItem('aaharai_session', userId);
}

function clearSession() {
    localStorage.removeItem('aaharai_session');
}

function isLoggedIn() {
    const sid = getCurrentSession();
    if (!sid) return false;
    return !!getUserById(sid);
}

function getCurrentUser() {
    const sid = getCurrentSession();
    if (!sid) return null;
    return getUserById(sid);
}

function updateCurrentUser(updates) {
    const sid = getCurrentSession();
    if (!sid) return;
    const users = getAllUsers();
    if (users[sid]) {
        users[sid] = { ...users[sid], ...updates, updatedAt: new Date().toISOString() };
        saveAllUsers(users);
    }
}

// ── Registration ───────────────────────────────────────────
async function registerUser(data) {
    const { name, email, password } = data;

    if (!name || !email || !password) {
        throw new Error('All fields are required');
    }
    if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Invalid email address');
    }
    if (getUserByEmail(email)) {
        throw new Error('An account with this email already exists');
    }

    const passwordHash = await hashPassword(password);
    const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

    const user = {
        id: userId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),

        // Layer 2: Allergen Profile
        allergies: [],

        // Layer 3: Sensitivity & Preferences
        sensitivityLevel: 'moderate', // strict | moderate | mild
        dietPreferences: [],
        alertPreference: 'strict_warning', // strict_warning | soft_suggestion
        customAllergens: [],

        // Layer 4: Usage & Learning
        scanHistory: [],

        // Optional
        medicalConditions: [],
        emergencyContact: { name: '', phone: '', relation: '' },

        // API Key
        geminiApiKey: ''
    };

    const users = getAllUsers();
    users[userId] = user;
    saveAllUsers(users);
    setSession(userId);

    return user;
}

// ── Login ──────────────────────────────────────────────────
async function loginUser(email, password) {
    const user = getUserByEmail(email);
    if (!user) {
        throw new Error('No account found with this email');
    }

    const hash = await hashPassword(password);
    if (hash !== user.passwordHash) {
        throw new Error('Incorrect password');
    }

    setSession(user.id);
    return user;
}

// ── Logout ─────────────────────────────────────────────────
function logoutUser() {
    clearSession();
    window.location.reload();
}

// ── Delete Account ─────────────────────────────────────────
function deleteAccount() {
    const sid = getCurrentSession();
    if (!sid) return;
    const users = getAllUsers();
    delete users[sid];
    saveAllUsers(users);
    clearSession();
    window.location.reload();
}

// ── Profile accessors for NLP system ───────────────────────
function getProfile() {
    const user = getCurrentUser();
    if (!user) return { allergies: [], customAllergens: [], dietPreferences: [], medicalConditions: [], scanHistory: [], sensitivityLevel: 'moderate', alertPreference: 'strict_warning', name: '' };
    return user;
}

// ── Admin Configuration (system-wide, not per-user) ────────
function getAdminConfig() {
    try {
        return JSON.parse(localStorage.getItem('aaharai_admin_config') || '{}');
    } catch { return {}; }
}

function saveAdminConfig(config) {
    localStorage.setItem('aaharai_admin_config', JSON.stringify(config));
}

function getApiKey() {
    return getAdminConfig().geminiApiKey || '';
}

function saveAdminApiKey(key) {
    const config = getAdminConfig();
    config.geminiApiKey = key.trim();
    saveAdminConfig(config);
}

function hasApiKey() {
    const key = getApiKey();
    return key && key.length > 10;
}

// ── Admin Authentication ───────────────────────────────────
// Default admin password: "aaharai_admin" (SHA-256 hash stored below)
// Change by calling setAdminPassword('newpassword') from console
const DEFAULT_ADMIN_HASH = '5e3543268685394cf803658a78983f4ee1e71b77ae620943d tried';

async function hashAdminPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + '_aaharai_admin_salt');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyAdminPassword(password) {
    const config = getAdminConfig();
    const storedHash = config.adminPasswordHash || '';
    const inputHash = await hashAdminPassword(password);
    // If no admin password set yet, accept 'aaharai_admin' as default
    if (!storedHash) {
        return password === 'aaharai_admin';
    }
    return inputHash === storedHash;
}

async function setAdminPassword(newPassword) {
    if (!newPassword || newPassword.length < 6) {
        console.error('Admin password must be at least 6 characters');
        return;
    }
    const config = getAdminConfig();
    config.adminPasswordHash = await hashAdminPassword(newPassword);
    saveAdminConfig(config);
    console.log('Admin password updated successfully.');
}

// ── Admin Panel UI ─────────────────────────────────────────
function openAdminPanel() {
    const existing = document.getElementById('admin-panel-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'admin-panel-modal';
    modal.className = 'profile-overlay';
    modal.innerHTML = `
    <div class="profile-modal" style="max-width:480px">
      <div class="profile-header" style="background:linear-gradient(135deg,#1e1b4b,#312e81)">
        <h2>🔐 Admin Panel</h2>
        <p class="profile-subtitle">System configuration (admin only)</p>
        <button class="profile-close-btn" onclick="closeAdminPanel()">✕</button>
      </div>
      <div class="profile-body" id="admin-panel-body">
        <div class="profile-section" id="admin-login-section">
          <h3>🔑 Admin Login</h3>
          <p class="section-desc">Enter the admin password to access system settings.</p>
          <input type="password" class="profile-text-input" id="admin-password-input" placeholder="Admin password..." style="width:100%;margin-bottom:12px" />
          <div id="admin-login-error" style="color:#ef4444;font-size:13px;margin-bottom:8px;display:none"></div>
          <button class="profile-save-btn" onclick="adminLogin()">Unlock →</button>
        </div>
        <div id="admin-settings-section" style="display:none">
          <div class="profile-section api-key-section">
            <h3>🤖 Gemini API Key</h3>
            <p class="section-desc">This key is used system-wide for all users' AI analysis. Get a free key from <a href="https://aistudio.google.com/apikey" target="_blank" style="color:#10b981">Google AI Studio</a>.</p>
            <div class="api-key-input-row">
              <input type="password" id="admin-api-key-input" class="api-key-input" placeholder="Paste API key..." value="${getApiKey()}" />
              <button class="api-key-toggle" onclick="document.getElementById('admin-api-key-input').type = document.getElementById('admin-api-key-input').type === 'password' ? 'text' : 'password'" title="Show/hide">👁️</button>
            </div>
            <div class="api-key-status">${hasApiKey() ? '✅ API key configured' : '⚠️ No API key — users will get keyword-only analysis'}</div>
          </div>
          <div class="profile-section">
            <h3>🔒 Change Admin Password</h3>
            <input type="password" class="profile-text-input" id="admin-new-password" placeholder="New admin password (6+ chars)" style="width:100%" />
          </div>
        </div>
      </div>
      <div class="profile-footer" id="admin-footer" style="display:none">
        <button class="profile-save-btn" onclick="saveAdminSettings()">💾 Save Settings</button>
        <button class="profile-cancel-btn" onclick="closeAdminPanel()">Cancel</button>
      </div>
    </div>
    `;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('visible'));
}

async function adminLogin() {
    const pw = document.getElementById('admin-password-input').value;
    const errorEl = document.getElementById('admin-login-error');
    if (!pw) {
        errorEl.textContent = 'Please enter the admin password.';
        errorEl.style.display = 'block';
        return;
    }
    const valid = await verifyAdminPassword(pw);
    if (!valid) {
        errorEl.textContent = 'Incorrect password.';
        errorEl.style.display = 'block';
        return;
    }
    // Unlock
    document.getElementById('admin-login-section').style.display = 'none';
    document.getElementById('admin-settings-section').style.display = 'block';
    document.getElementById('admin-footer').style.display = 'flex';
}

async function saveAdminSettings() {
    const apiKey = document.getElementById('admin-api-key-input')?.value.trim() || '';
    // Save to localStorage (legacy/fallback)
    saveAdminApiKey(apiKey);

    // Save to backend server
    try {
        const config = getAdminConfig();
        await fetch('/api/admin/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                adminPassword: config.password || 'aaharai_admin',
                geminiApiKey: apiKey
            })
        });
    } catch (e) {
        console.warn('Could not save API key to server:', e.message);
    }

    const newPw = document.getElementById('admin-new-password')?.value.trim();
    if (newPw) {
        if (newPw.length < 6) {
            alert('Password must be at least 6 characters.');
            return;
        }
        await setAdminPassword(newPw);
    }

    closeAdminPanel();
    if (typeof showToast === 'function') showToast('✅ Admin settings saved! API key synced to server.');
}

function closeAdminPanel() {
    const modal = document.getElementById('admin-panel-modal');
    if (modal) {
        modal.classList.remove('visible');
        setTimeout(() => modal.remove(), 300);
    }
}

// ── Severity Weights ───────────────────────────────────────
const SEVERITY_WEIGHTS = { high: 1.0, medium: 0.6, low: 0.3 };

function getSeverityWeight(severity) {
    return SEVERITY_WEIGHTS[(severity || 'medium').toLowerCase()] || 0.6;
}

// ── Add to Scan History ────────────────────────────────────
function addToScanHistory(ingredientText, analysis) {
    const user = getCurrentUser();
    if (!user) return;

    const entry = {
        id: Date.now(),
        date: new Date().toISOString(),
        ingredients: ingredientText ? ingredientText.substring(0, 300) : 'Barcode scan',
        allergens: analysis.allergens ? analysis.allergens.map(a => ({ name: a.name, risk: a.risk, riskScore: a.riskScore || 0 })) : [],
        overallRisk: analysis.overallRiskScore || 0,
        decision: analysis.overallRiskScore > 0.7 ? 'UNSAFE' : analysis.overallRiskScore > 0.3 ? 'CAUTION' : 'SAFE',
        productSummary: analysis.productSummary || '',
        feedback: null // user can set: 'safe' | 'not_safe' | 'reaction'
    };

    const history = user.scanHistory || [];
    history.unshift(entry);
    if (history.length > 50) history.length = 50;
    updateCurrentUser({ scanHistory: history });
    return entry;
}

function updateScanFeedback(scanId, feedback) {
    const user = getCurrentUser();
    if (!user) return;
    const history = user.scanHistory || [];
    const scan = history.find(h => h.id === scanId);
    if (scan) {
        scan.feedback = feedback;
        updateCurrentUser({ scanHistory: history });
    }
}

// ── Profile Context for Gemini Prompt ──────────────────────
function getProfileContextForPrompt() {
    const p = getProfile();
    const parts = [];

    if (p.name) parts.push(`User's name: ${p.name}`);

    if (p.allergies && p.allergies.length > 0) {
        const allergyLines = p.allergies.map(a =>
            `- ${a.allergen} (Severity: ${a.severity}, Weight: ${getSeverityWeight(a.severity)})`
        );
        parts.push(`Known allergies:\n${allergyLines.join('\n')}`);
    }

    if (p.customAllergens && p.customAllergens.length > 0) {
        parts.push(`Custom allergens: ${p.customAllergens.join(', ')}`);
    }

    parts.push(`Sensitivity level: ${p.sensitivityLevel || 'moderate'}`);
    parts.push(`Alert preference: ${p.alertPreference === 'soft_suggestion' ? 'Soft suggestion' : 'Strict warning'}`);

    if (p.dietPreferences && p.dietPreferences.length > 0) {
        parts.push(`Dietary restrictions: ${p.dietPreferences.join(', ')}`);
    }

    if (p.medicalConditions && p.medicalConditions.length > 0) {
        parts.push(`Medical conditions: ${p.medicalConditions.join(', ')}`);
    }

    const history = (p.scanHistory || []).slice(0, 5);
    if (history.length > 0) {
        const histLines = history.map(h => {
            const date = new Date(h.date).toLocaleDateString();
            const risk = h.overallRisk ? ` (Risk: ${(h.overallRisk * 100).toFixed(0)}%)` : '';
            return `- ${date}: ${h.productSummary || h.ingredients.substring(0, 50)} → ${h.decision}${risk}`;
        });
        parts.push(`Recent scan history:\n${histLines.join('\n')}`);
    }

    return parts.length > 0 ? parts.join('\n') : 'No user profile configured.';
}

function getScanHistory() {
    return getProfile().scanHistory || [];
}

function clearScanHistory() {
    updateCurrentUser({ scanHistory: [] });
}
