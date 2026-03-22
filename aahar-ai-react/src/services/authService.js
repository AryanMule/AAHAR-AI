// ============================================================
// AAHAR-AI — Auth Service (React Ready)
// Clean: No DOM, No window, Only logic
// ============================================================

// ── Password Hashing ───────────────────────────────────────
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "_aaharai_salt_2025");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// ── Storage Helpers ────────────────────────────────────────
function getAllUsers() {
  try {
    return JSON.parse(localStorage.getItem("aaharai_users") || "{}");
  } catch {
    return {};
  }
}

function saveAllUsers(users) {
  localStorage.setItem("aaharai_users", JSON.stringify(users));
}

function getUserByEmail(email) {
  const users = getAllUsers();
  return Object.values(users).find(
    u => u.email === email.toLowerCase().trim()
  );
}

function getUserById(id) {
  return getAllUsers()[id] || null;
}

// ── Session Management ─────────────────────────────────────
function setSession(userId) {
  localStorage.setItem("aaharai_session", userId);
}

function clearSession() {
  localStorage.removeItem("aaharai_session");
}

export function getCurrentUser() {
  const sid = localStorage.getItem("aaharai_session");
  if (!sid) return null;
  return getUserById(sid);
}

// ── Register ───────────────────────────────────────────────
export async function registerUser({ name, email, password }) {
  if (!name || !email || !password) {
    throw new Error("All fields are required");
  }

  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Invalid email address");
  }

  if (getUserByEmail(email)) {
    throw new Error("User already exists");
  }

  const passwordHash = await hashPassword(password);

  const userId =
    "user_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);

  const user = {
    id: userId,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),

    allergies: [],
    sensitivityLevel: "moderate",
    dietPreferences: [],
    alertPreference: "strict_warning",
    customAllergens: [],
    scanHistory: [],
    medicalConditions: [],
    emergencyContact: { name: "", phone: "", relation: "" },
    geminiApiKey: ""
  };

  const users = getAllUsers();
  users[userId] = user;

  saveAllUsers(users);
  setSession(userId);

  return user;
}

// ── Login ──────────────────────────────────────────────────
export async function loginUser(email, password) {
  const user = getUserByEmail(email);

  if (!user) {
    throw new Error("No account found");
  }

  const hash = await hashPassword(password);

  if (hash !== user.passwordHash) {
    throw new Error("Incorrect password");
  }

  setSession(user.id);
  return user;
}

// ── Logout ─────────────────────────────────────────────────
export function logoutUser() {
  clearSession();
}

// ── Update User ────────────────────────────────────────────
export function updateCurrentUser(updates) {
  const sid = localStorage.getItem("aaharai_session");
  if (!sid) return;

  const users = getAllUsers();

  if (users[sid]) {
    users[sid] = {
      ...users[sid],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    saveAllUsers(users);
  }
}

// ── Delete Account ─────────────────────────────────────────
export function deleteAccount() {
  const sid = localStorage.getItem("aaharai_session");
  if (!sid) return;

  const users = getAllUsers();
  delete users[sid];

  saveAllUsers(users);
  clearSession();
}

// ── Profile Getter ─────────────────────────────────────────
export function getProfile() {
  const user = getCurrentUser();

  if (!user) {
    return {
      allergies: [],
      customAllergens: [],
      dietPreferences: [],
      medicalConditions: [],
      scanHistory: [],
      sensitivityLevel: "moderate",
      alertPreference: "strict_warning",
      name: ""
    };
  }

  return user;
}