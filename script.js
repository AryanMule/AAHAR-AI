// ============================================================
// AAHAR-AI — Main Script (Apple-Inspired Dynamic UI)
// Auth gate, onboarding wizard, scroll animations, webcam
// ============================================================

// ── Allergen options for onboarding ────────────────────────
const OB_ALLERGENS = [
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

const OB_DIETS = [
    { id: 'vegetarian', label: '🥗 Vegetarian' },
    { id: 'vegan', label: '🌱 Vegan' },
    { id: 'halal', label: '☪️ Halal' },
    { id: 'kosher', label: '✡️ Kosher' },
    { id: 'keto', label: '🥑 Keto' },
    { id: 'paleo', label: '🍖 Paleo' },
    { id: 'gluten_free', label: '🚫🌾 Gluten Free' },
    { id: 'dairy_free', label: '🚫🥛 Dairy Free' },
    { id: 'low_sodium', label: '🧂 Low Sodium' },
    { id: 'low_sugar', label: '🍬 Low Sugar' }
];

const OB_MEDICAL = [
    { id: 'celiac', label: '⚕️ Celiac Disease' },
    { id: 'diabetes_t1', label: '💉 Type 1 Diabetes' },
    { id: 'diabetes_t2', label: '📊 Type 2 Diabetes' },
    { id: 'lactose_intolerant', label: '🥛❌ Lactose Intolerance' },
    { id: 'ibs', label: '🏥 IBS / IBD' },
    { id: 'hypertension', label: '❤️‍🩹 Hypertension' },
    { id: 'high_cholesterol', label: '🫀 High Cholesterol' },
    { id: 'gout', label: '🦴 Gout' },
    { id: 'eosinophilic_esophagitis', label: '🔬 EoE' },
    { id: 'histamine_intolerance', label: '🧬 Histamine Intolerance' }
];

// ══════════════════════════════════════════════════════════════
// SCROLL ANIMATIONS (Intersection Observer)
// ══════════════════════════════════════════════════════════════

function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const delay = parseInt(el.dataset.delay) || 0;
                setTimeout(() => el.classList.add('visible'), delay);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -60px 0px'
    });

    document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));
}

// ── Navbar Scroll Effect ───────────────────────────────────
function initNavbarScroll() {
    const nav = document.getElementById('sg-nav');
    if (!nav) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 60) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    }, { passive: true });
}

// ══════════════════════════════════════════════════════════════
// AUTH FLOW
// ══════════════════════════════════════════════════════════════

function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    if (tab === 'login') {
        document.querySelectorAll('.auth-tab')[0].classList.add('active');
        document.getElementById('login-form').classList.add('active');
    } else {
        document.querySelectorAll('.auth-tab')[1].classList.add('active');
        document.getElementById('register-form').classList.add('active');
    }
    hideAuthError();
}

function showAuthError(msg) {
    const el = document.getElementById('auth-error');
    el.textContent = msg;
    el.classList.add('visible');
}

function hideAuthError() {
    document.getElementById('auth-error').classList.remove('visible');
}

async function handleLogin(e) {
    e.preventDefault();
    hideAuthError();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try {
        await loginUser(email, password);
        showApp();
    } catch (err) {
        showAuthError(err.message);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    hideAuthError();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    try {
        await registerUser({ name, email, password });
        showOnboarding();
    } catch (err) {
        showAuthError(err.message);
    }
}

function showApp() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('onboarding-screen').classList.remove('active');

    // Show navbar and main content
    const nav = document.getElementById('sg-nav');
    if (nav) nav.style.display = 'block';

    const user = getCurrentUser();
    if (user) {
        const navUser = document.getElementById('nav-user');
        if (navUser) navUser.textContent = user.name;
    }

    // Init dynamic features
    initScrollAnimations();
    initNavbarScroll();
}

// ══════════════════════════════════════════════════════════════
// ONBOARDING WIZARD
// ══════════════════════════════════════════════════════════════

let obStep = 1;
const OB_TOTAL_STEPS = 3;

function showOnboarding() {
    document.getElementById('auth-screen').style.display = 'none';
    const screen = document.getElementById('onboarding-screen');
    screen.classList.add('active');
    obStep = 1;
    renderOnboardingAllergens();
    renderOnboardingDiets();
    renderOnboardingMedical();
    updateOnboardingUI();
}

function renderOnboardingAllergens() {
    const container = document.getElementById('ob-allergen-selector');
    container.innerHTML = OB_ALLERGENS.map(a => `
    <div class="allergen-item" data-id="${a.id}" onclick="toggleOnboardingAllergen(this)">
      <div class="allergen-item-header">
        <span class="allergen-item-icon">${a.icon}</span>
        <span class="allergen-item-name">${a.label}</span>
        <span class="allergen-item-check">✓</span>
      </div>
      <div class="severity-selector" style="display:none">
        <button class="severity-btn sev-low" data-sev="low" onclick="event.stopPropagation(); setSeverity(this)">Low (0.3)</button>
        <button class="severity-btn sev-medium active" data-sev="medium" onclick="event.stopPropagation(); setSeverity(this)">Med (0.6)</button>
        <button class="severity-btn sev-high" data-sev="high" onclick="event.stopPropagation(); setSeverity(this)">High (1.0)</button>
      </div>
    </div>
  `).join('');
}

function renderOnboardingDiets() {
    document.getElementById('ob-diet-chips').innerHTML = OB_DIETS.map(d =>
        `<button class="ob-chip" data-id="${d.id}" onclick="this.classList.toggle('active')">${d.label}</button>`
    ).join('');
}

function renderOnboardingMedical() {
    document.getElementById('ob-medical-chips').innerHTML = OB_MEDICAL.map(m =>
        `<button class="ob-chip" data-id="${m.id}" onclick="this.classList.toggle('active')">${m.label}</button>`
    ).join('');
}

function toggleOnboardingAllergen(el) {
    el.classList.toggle('selected');
    const sevSelector = el.querySelector('.severity-selector');
    sevSelector.style.display = el.classList.contains('selected') ? 'flex' : 'none';
}

function setSeverity(btn) {
    const parent = btn.closest('.severity-selector');
    parent.querySelectorAll('.severity-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function selectSensitivity(card) {
    document.querySelectorAll('.sensitivity-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
}

function selectAlert(chip) {
    document.querySelectorAll('[data-alert]').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
}

function addOnboardingCustomAllergen() {
    const input = document.getElementById('ob-custom-allergen');
    const val = input.value.trim();
    if (!val) return;
    const container = document.getElementById('ob-custom-tags');
    const tag = document.createElement('button');
    tag.className = 'ob-chip active';
    tag.textContent = val;
    tag.onclick = function () { this.remove(); };
    container.appendChild(tag);
    input.value = '';
}

function updateOnboardingUI() {
    document.getElementById('ob-progress-fill').style.width = ((obStep / OB_TOTAL_STEPS) * 100) + '%';

    document.querySelectorAll('.progress-step').forEach(s => {
        const step = parseInt(s.dataset.step);
        s.classList.remove('active', 'done');
        if (step === obStep) s.classList.add('active');
        else if (step < obStep) s.classList.add('done');
    });

    document.querySelectorAll('.onboarding-step').forEach(s => s.classList.remove('active'));
    const currentStep = document.getElementById('ob-step-' + obStep);
    if (currentStep) currentStep.classList.add('active');

    document.getElementById('ob-btn-back').style.visibility = obStep > 1 ? 'visible' : 'hidden';
    document.getElementById('ob-btn-next').textContent = obStep >= OB_TOTAL_STEPS ? '🚀 Launch AAHAR-AI' : 'Continue →';
}

function onboardingNext() {
    if (obStep >= OB_TOTAL_STEPS) {
        finishOnboarding();
        return;
    }
    obStep++;
    updateOnboardingUI();
}

function onboardingPrev() {
    if (obStep > 1) {
        obStep--;
        updateOnboardingUI();
    }
}

function finishOnboarding() {
    const allergies = [];
    document.querySelectorAll('#ob-allergen-selector .allergen-item.selected').forEach(el => {
        const id = el.dataset.id;
        const opt = OB_ALLERGENS.find(a => a.id === id);
        const activeSev = el.querySelector('.severity-btn.active');
        const severity = activeSev ? activeSev.dataset.sev : 'medium';
        allergies.push({
            allergen: opt ? opt.label : id,
            severity: severity.charAt(0).toUpperCase() + severity.slice(1),
            weight: SEVERITY_WEIGHTS[severity] || 0.6
        });
    });

    const customAllergens = [];
    document.querySelectorAll('#ob-custom-tags .ob-chip').forEach(c => {
        customAllergens.push(c.textContent.trim());
    });

    const sensCard = document.querySelector('.sensitivity-card.selected');
    const sensitivityLevel = sensCard ? sensCard.dataset.value : 'moderate';

    const alertChip = document.querySelector('[data-alert].active');
    const alertPreference = alertChip ? alertChip.dataset.alert : 'strict_warning';

    const dietPreferences = [];
    document.querySelectorAll('#ob-diet-chips .ob-chip.active').forEach(c => dietPreferences.push(c.dataset.id));

    const medicalConditions = [];
    document.querySelectorAll('#ob-medical-chips .ob-chip.active').forEach(c => medicalConditions.push(c.dataset.id));

    const emergencyName = document.getElementById('ob-emergency-name')?.value.trim() || '';
    const emergencyPhone = document.getElementById('ob-emergency-phone')?.value.trim() || '';

    updateCurrentUser({
        allergies, customAllergens, sensitivityLevel, alertPreference,
        dietPreferences, medicalConditions,
        emergencyContact: { name: emergencyName, phone: emergencyPhone, relation: '' }
    });

    showApp();
}

// ══════════════════════════════════════════════════════════════
// APP INITIALIZATION
// ══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    if (isLoggedIn()) {
        showApp();
    }
});

// ══════════════════════════════════════════════════════════════
// MODE SWITCHING & WEBCAM
// ══════════════════════════════════════════════════════════════

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
const outputImage = document.getElementById('output-image');
const startButton = document.getElementById('start-btn');
const captureButton = document.getElementById('capture-btn');

let currentMode = 'product';
let stream;

function switchMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.sg-mode-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.mode === mode);
    });

    const cameraArea = document.querySelector('.sg-camera-area');
    const cameraButtons = document.getElementById('camera-buttons');
    const textInputSection = document.getElementById('text-input-section');
    const instruction = document.getElementById('scan-instruction');
    const uploadSection = document.getElementById('upload-section');

    // Clear any previous upload preview
    clearUploadPreview();

    if (mode === 'text') {
        if (cameraArea) cameraArea.style.display = 'none';
        if (cameraButtons) cameraButtons.style.display = 'none';
        if (uploadSection) uploadSection.style.display = 'none';
        if (textInputSection) textInputSection.classList.add('visible');
        if (instruction) instruction.textContent = 'Paste or type your ingredient list below and click Analyze!';
    } else {
        if (cameraArea) cameraArea.style.display = 'block';
        if (cameraButtons) cameraButtons.style.display = 'flex';
        if (uploadSection) uploadSection.style.display = 'block';
        if (textInputSection) textInputSection.classList.remove('visible');

        if (mode === 'product') {
            if (instruction) instruction.textContent = 'Take a photo of the product or its packaging — our AI will identify it instantly!';
            captureButton.innerHTML = '📸 Capture';
        } else {
            if (instruction) instruction.textContent = 'Point at the ingredient label on the package and capture a clear image.';
            captureButton.innerHTML = '🏷️ Read';
        }
    }
    clearResults();
}

function startWebcam() {
    navigator.mediaDevices.getUserMedia({ video: true })
        .then((streamObj) => {
            stream = streamObj;
            video.srcObject = stream;
            video.play();
            captureButton.style.display = 'flex';
            startButton.style.display = 'none';
        })
        .catch((error) => {
            console.error('Camera error:', error);
            alert('Could not access camera. Please allow camera permissions.');
        });
}

startButton.addEventListener('click', () => startWebcam());

captureButton.addEventListener('click', () => {
    video.pause();
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageDataURL = canvas.toDataURL('image/png');
    video.play();

    if (currentMode === 'product') {
        analyzeProductImage(imageDataURL);
    } else if (currentMode === 'ocr') {
        analyzeIngredientImage(imageDataURL);
    }
});

// ══════════════════════════════════════════════════════════════
// IMAGE UPLOAD HANDLER
// ══════════════════════════════════════════════════════════════

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const imageDataURL = e.target.result;

        // Show preview with Analyze button (don't auto-trigger)
        const preview = document.getElementById('upload-preview');
        const previewImg = document.getElementById('upload-preview-img');
        if (preview && previewImg) {
            previewImg.src = imageDataURL;
            preview.style.display = 'flex';
        }
    };
    reader.readAsDataURL(file);
}

function analyzeUploadedImage() {
    const previewImg = document.getElementById('upload-preview-img');
    if (!previewImg || !previewImg.src) {
        alert('Please upload an image first.');
        return;
    }
    const imageDataURL = previewImg.src;

    if (currentMode === 'product') {
        analyzeProductImage(imageDataURL);
    } else if (currentMode === 'ocr') {
        analyzeIngredientImage(imageDataURL);
    }
}

function clearUploadPreview() {
    const preview = document.getElementById('upload-preview');
    const previewImg = document.getElementById('upload-preview-img');
    const fileInput = document.getElementById('image-upload-input');
    if (preview) preview.style.display = 'none';
    if (previewImg) previewImg.src = '';
    if (fileInput) fileInput.value = '';
}

// ══════════════════════════════════════════════════════════════
// ADMIN PANEL TRIGGER (5 clicks on footer brand)
// ══════════════════════════════════════════════════════════════

let _footerClickCount = 0;
let _footerClickTimer = null;

function handleFooterBrandClick() {
    _footerClickCount++;
    clearTimeout(_footerClickTimer);
    _footerClickTimer = setTimeout(() => { _footerClickCount = 0; }, 2000);
    if (_footerClickCount >= 5) {
        _footerClickCount = 0;
        openAdminPanel();
    }
}
