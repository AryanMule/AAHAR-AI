// ============================================================
// AAHAR-AI — Profile Modal (Edit profile after onboarding)
// Data storage/access is handled by auth.js
// ============================================================

const ALLERGY_OPTIONS_MODAL = [
  { id: 'milk', label: 'Milk / Dairy', icon: '🥛' },
  { id: 'eggs', label: 'Eggs', icon: '🥚' },
  { id: 'peanuts', label: 'Peanuts', icon: '🥜' },
  { id: 'tree_nuts', label: 'Tree Nuts', icon: '🌰' },
  { id: 'wheat', label: 'Wheat / Gluten', icon: '🌾' },
  { id: 'soy', label: 'Soy', icon: '🫘' },
  { id: 'fish', label: 'Fish', icon: '🐟' },
  { id: 'shellfish', label: 'Shellfish', icon: '🦐' },
  { id: 'sesame', label: 'Sesame', icon: '⚪' },
  { id: 'mustard', label: 'Mustard', icon: '🟡' },
  { id: 'celery', label: 'Celery', icon: '🥬' },
  { id: 'sulfites', label: 'Sulfites', icon: '🧪' }
];

const DIET_OPTIONS_MODAL = [
  { id: 'vegetarian', label: 'Vegetarian', icon: '🥗' },
  { id: 'vegan', label: 'Vegan', icon: '🌱' },
  { id: 'halal', label: 'Halal', icon: '☪️' },
  { id: 'kosher', label: 'Kosher', icon: '✡️' },
  { id: 'keto', label: 'Keto', icon: '🥑' },
  { id: 'paleo', label: 'Paleo', icon: '🍖' },
  { id: 'gluten_free', label: 'Gluten Free', icon: '🚫🌾' },
  { id: 'dairy_free', label: 'Dairy Free', icon: '🚫🥛' },
  { id: 'low_sodium', label: 'Low Sodium', icon: '🧂' },
  { id: 'low_sugar', label: 'Low Sugar', icon: '🍬' }
];

const HEALTH_OPTIONS_MODAL = [
  { id: 'celiac', label: 'Celiac Disease', icon: '⚕️' },
  { id: 'diabetes_t1', label: 'Type 1 Diabetes', icon: '💉' },
  { id: 'diabetes_t2', label: 'Type 2 Diabetes', icon: '📊' },
  { id: 'lactose_intolerant', label: 'Lactose Intolerance', icon: '🥛❌' },
  { id: 'ibs', label: 'IBS / IBD', icon: '🏥' },
  { id: 'hypertension', label: 'Hypertension', icon: '❤️‍🩹' },
  { id: 'high_cholesterol', label: 'High Cholesterol', icon: '🫀' },
  { id: 'gout', label: 'Gout', icon: '🦴' },
  { id: 'eosinophilic_esophagitis', label: 'EoE', icon: '🔬' },
  { id: 'histamine_intolerance', label: 'Histamine Intolerance', icon: '🧬' }
];

// ── Render Profile Modal ───────────────────────────────────
function openProfileModal() {
  const existing = document.getElementById('profile-modal');
  if (existing) existing.remove();

  const user = getCurrentUser();
  if (!user) return;

  const allergies = user.allergies || [];
  const allergyIds = allergies.map(a => {
    const opt = ALLERGY_OPTIONS_MODAL.find(o => a.allergen.toLowerCase().includes(o.id.replace('_', ' ')));
    return opt ? opt.id : null;
  }).filter(Boolean);

  const modal = document.createElement('div');
  modal.id = 'profile-modal';
  modal.className = 'profile-overlay';
  modal.innerHTML = `
    <div class="profile-modal">
      <div class="profile-header">
        <h2>👤 ${user.name}'s Health Profile</h2>
        <p class="profile-subtitle">Your personalized allergen detection settings</p>
        <button class="profile-close-btn" onclick="closeProfileModal()">✕</button>
      </div>

      <div class="profile-body">

        <!-- Allergen Profile with Severity -->
        <div class="profile-section">
          <h3>⚠️ Allergen Profile</h3>
          <p class="section-desc">Current allergies with severity weights for risk scoring</p>
          <div id="profile-allergies-list">
            ${allergies.length > 0 ? allergies.map((a, i) => `
              <div class="profile-allergy-row" data-index="${i}">
                <span class="profile-allergy-name">${a.allergen}</span>
                <span class="profile-severity-badge sev-${(a.severity || 'medium').toLowerCase()}">${a.severity} (${a.weight || getSeverityWeight(a.severity)})</span>
                <button class="remove-allergy-btn" onclick="this.parentElement.remove()">✕</button>
              </div>
            `).join('') : '<p class="empty-history">No allergies configured. Add them during onboarding or below.</p>'}
          </div>
        </div>

        <!-- Sensitivity -->
        <div class="profile-section">
          <h3>🎛️ Sensitivity: <strong>${(user.sensitivityLevel || 'moderate').toUpperCase()}</strong></h3>
          <p class="section-desc">Alert mode: ${user.alertPreference === 'soft_suggestion' ? '💡 Soft Suggestion' : '🚨 Strict Warning'}</p>
        </div>

        <!-- Diet -->
        <div class="profile-section">
          <h3>🥗 Diet Preferences</h3>
          <div class="chip-grid">
            ${DIET_OPTIONS_MODAL.map(opt => `
              <button class="chip ${(user.dietPreferences || []).includes(opt.id) ? 'active' : ''}"
                data-id="${opt.id}" onclick="this.classList.toggle('active')">
                <span class="chip-icon">${opt.icon}</span> ${opt.label}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Medical -->
        <div class="profile-section">
          <h3>🏥 Medical Conditions</h3>
          <div class="chip-grid">
            ${HEALTH_OPTIONS_MODAL.map(opt => `
              <button class="chip ${(user.medicalConditions || []).includes(opt.id) ? 'active' : ''}"
                data-id="${opt.id}" onclick="this.classList.toggle('active')">
                <span class="chip-icon">${opt.icon}</span> ${opt.label}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Emergency Contact -->
        <div class="profile-section">
          <h3>🆘 Emergency Contact</h3>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <input type="text" class="profile-text-input" id="profile-emerg-name" placeholder="Name" value="${user.emergencyContact?.name || ''}" style="flex:1;min-width:150px" />
            <input type="text" class="profile-text-input" id="profile-emerg-phone" placeholder="Phone" value="${user.emergencyContact?.phone || ''}" style="flex:1;min-width:150px" />
          </div>
        </div>

        <!-- Scan History -->
        <div class="profile-section">
          <h3>📜 Scan History (${(user.scanHistory || []).length} scans)</h3>
          <div id="scan-history-list">${renderScanHistoryHTML(user.scanHistory || [])}</div>
          ${(user.scanHistory || []).length > 0 ? '<button class="clear-history-btn" onclick="clearScanHistoryUI()">🗑️ Clear History</button>' : ''}
        </div>

        <!-- Danger Zone -->
        <div class="profile-section" style="border-top: 2px solid rgba(239,68,68,0.2); padding-top:20px;">
          <h3 style="color:#ef4444;">🚨 Danger Zone</h3>
          <button class="clear-history-btn" style="background:#fef2f2;color:#dc2626;border-color:#fecaca;" onclick="if(confirm('Delete your account and all data?')) deleteAccount();">
            Delete My Account
          </button>
          <p class="section-desc" style="margin-top:8px;">This permanently removes all your data from this device.</p>
        </div>

      </div>

      <div class="profile-footer">
        <button class="profile-save-btn" onclick="saveProfileFromModal()">💾 Save Changes</button>
        <button class="profile-cancel-btn" onclick="closeProfileModal()">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('visible'));
}

function renderScanHistoryHTML(history) {
  if (!history || history.length === 0) {
    return '<p class="empty-history">No scans yet.</p>';
  }
  return history.slice(0, 20).map(h => {
    const date = new Date(h.date);
    const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const riskPct = h.overallRisk ? (h.overallRisk * 100).toFixed(0) + '% risk' : '';
    const decisionBadge = h.decision === 'UNSAFE' ? '<span class="history-allergen-badge">UNSAFE</span>' :
      h.decision === 'CAUTION' ? '<span style="background:#fff3e0;color:#e65100;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600">CAUTION</span>' :
        '<span class="history-safe-badge">SAFE</span>';
    return `
      <div class="history-entry">
        <div class="history-date">${dateStr} ${riskPct}</div>
        <div class="history-product">${h.productSummary || h.ingredients.substring(0, 80)}</div>
        <div class="history-allergens">${decisionBadge}</div>
      </div>
    `;
  }).join('');
}

function closeProfileModal() {
  const modal = document.getElementById('profile-modal');
  if (modal) {
    modal.classList.remove('visible');
    setTimeout(() => modal.remove(), 300);
  }
}

function saveProfileFromModal() {
  const dietPreferences = [];
  document.querySelectorAll('#profile-modal .profile-section:nth-child(3) .chip.active').forEach(c => {
    dietPreferences.push(c.dataset.id);
  });

  const medicalConditions = [];
  document.querySelectorAll('#profile-modal .profile-section:nth-child(4) .chip.active').forEach(c => {
    medicalConditions.push(c.dataset.id);
  });

  const emergName = document.getElementById('profile-emerg-name')?.value.trim() || '';
  const emergPhone = document.getElementById('profile-emerg-phone')?.value.trim() || '';

  updateCurrentUser({
    dietPreferences,
    medicalConditions,
    emergencyContact: { name: emergName, phone: emergPhone, relation: '' }
  });

  closeProfileModal();
  showToast('✅ Profile saved!');
}

function clearScanHistoryUI() {
  if (confirm('Clear all scan history?')) {
    clearScanHistory();
    openProfileModal(); // Refresh
  }
}

// ── Toast ──────────────────────────────────────────────────
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}
