// ============================================================
//  StudentHub Portal – main.js
//  Connects to Student API at http://localhost:3000
// ============================================================

import {
  isAuth0Configured,
  getStoredToken,
  getStoredUser,
  setSession,
  loginWithAuth0,
  handleAuthCallback,
  clearSession,
  createLocalDevToken
} from './auth.js';

function resolveApiBase() {
  let url = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api');
  if (!url.startsWith('http') && !url.startsWith('/')) url = `https://${url}`;
  if (!url.endsWith('/api') && url.startsWith('http')) url = `${url.replace(/\/$/, '')}/api`;
  return url;
}
const API_BASE = resolveApiBase();

const STACK_META = {
  MERN:    { color: '#61dafb', chipClass: 'chip-mern',    label: 'MERN Stack',              dot: '#61dafb' },
  MEAN:    { color: '#dd1b16', chipClass: 'chip-mean',    label: 'MEAN Stack',              dot: '#dd1b16' },
  Python:  { color: '#ffd845', chipClass: 'chip-python',  label: 'Python / Django / Flask', dot: '#ffd845' },
  Android: { color: '#3ddc84', chipClass: 'chip-android', label: 'Android Dev',             dot: '#3ddc84' },
  iOS:     { color: '#a0a0a0', chipClass: 'chip-ios',     label: 'iOS Dev',                 dot: '#a0a0a0' },
};

const PROFICIENCY_CLASS = {
  Beginner:     'level-beginner',
  Intermediate: 'level-intermediate',
  Advanced:     'level-advanced',
};

const AVATAR_GRADIENTS = [
  ['#4f8ef7','#7c6eff'], ['#f75f7e','#ff9a6c'],
  ['#1dd9c8','#4f8ef7'], ['#4fca8e','#1dd9c8'],
  ['#f7a84f','#f75f7e'], ['#7c6eff','#f75f7e'],
];

// ── State ────────────────────────────────────────────────────
let allStudents  = [];
let filtered     = [];
let currentPage  = 1;
const PAGE_SIZE  = 12;
let activeStack  = 'ALL';
let searchQuery  = '';
let sortMode     = 'id-asc';



function getRequestHeaders() {
  const token = getStoredToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function updateAuthBtnUI() {
  const authBtn  = document.getElementById('authBtn');
  const authIcon = document.getElementById('authIcon');
  const authText = document.getElementById('authText');
  if (!authBtn) return;

  const token = getStoredToken();
  const user = getStoredUser();

  if (token) {
    authBtn.classList.add('authenticated');
    authIcon.textContent = '🔓';
    authText.textContent = user?.name ? `${user.name} (Sign Out)` : 'Logged In (Sign Out)';
    authBtn.title = 'Signed in with Auth0. Click to sign out.';
  } else {
    authBtn.classList.remove('authenticated');
    authIcon.textContent = '🔒';
    authText.textContent = 'Log In with Auth0';
    authBtn.title = 'Click to log in with Auth0 and view unmasked student contacts.';
  }
}

function openAuthModal() {
  modalBody.innerHTML = `
    <div style="padding: 6px 0;">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;">
        <div style="font-size:2rem;background:rgba(99,102,241,0.18);padding:12px;border-radius:12px;border:1px solid rgba(99,102,241,0.35);">🔐</div>
        <div>
          <h3 style="margin:0;font-size:1.25rem;font-weight:700;color:#fff;">Auth0 OAuth 2.0 Login</h3>
          <p style="margin:4px 0 0;font-size:0.8rem;color:var(--text-muted);">Authenticate with Auth0 to access unmasked student emails and mobile numbers</p>
        </div>
      </div>

      <div style="background:rgba(255,255,255,0.04);border:1px solid var(--border-subtle);border-radius:10px;padding:14px;margin-bottom:18px;">
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.82rem;">
          <span style="color:var(--text-secondary);font-weight:600;">Current State:</span>
          <span style="background:rgba(247,168,79,0.18);color:var(--accent-amber);padding:4px 12px;border-radius:100px;font-weight:700;font-size:0.75rem;">🔒 Privacy Masked (Fail-Closed)</span>
        </div>
        <div style="font-size:0.78rem;color:var(--text-muted);margin-top:8px;line-height:1.45;">
          Per <strong>SEC-05</strong>, all hardcoded secrets and demo keys have been removed. Unauthenticated requests always fail closed to protect student personal data.
        </div>
      </div>

      ${isAuth0Configured() ? `
        <button id="auth0RedirectBtn" style="width:100%;display:flex;align-items:center;justify-content:center;gap:8px;background:linear-gradient(135deg,#4f8ef7,#7c6eff);color:#fff;border:none;padding:12px;border-radius:10px;font-weight:700;font-size:0.95rem;cursor:pointer;margin-bottom:12px;box-shadow:0 4px 14px rgba(99,102,241,0.35);">
          🚀 Continue to Auth0 Login (PKCE)
        </button>
      ` : `
        <div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.25);border-radius:10px;padding:12px;margin-bottom:16px;font-size:0.8rem;color:var(--text-secondary);">
          💡 <strong>Production Setup</strong>: Set <code>VITE_AUTH0_DOMAIN</code> and <code>VITE_AUTH0_CLIENT_ID</code> in <code>.env</code> for live cloud Auth0 redirect.
        </div>

        <button id="auth0MockBtn" style="width:100%;display:flex;align-items:center;justify-content:center;gap:8px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;padding:13px;border-radius:10px;font-weight:700;font-size:0.92rem;cursor:pointer;margin-bottom:16px;box-shadow:0 4px 14px rgba(16,185,129,0.25);">
          ⚡ Sign In with Demo Recruiter Token (Local Dev)
        </button>

        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
          <div style="flex:1;height:1px;background:var(--border-subtle);"></div>
          <span style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;font-weight:600;">or paste bearer token</span>
          <div style="flex:1;height:1px;background:var(--border-subtle);"></div>
        </div>

        <div style="margin-bottom:12px;">
          <input id="tokenInput" type="text" placeholder="Paste Auth0 Bearer Token (JWT)..." style="width:100%;box-sizing:border-box;background:var(--bg-primary);border:1px solid var(--border-mid);color:#fff;padding:10px 14px;border-radius:8px;font-size:0.8rem;font-family:monospace;" />
        </div>

        <button id="applyTokenBtn" style="width:100%;background:rgba(255,255,255,0.08);border:1px solid var(--border-mid);color:#fff;padding:10px;border-radius:8px;font-weight:600;font-size:0.85rem;cursor:pointer;">
          Apply Bearer Token
        </button>
      `}
    </div>
  `;

  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  const redirectBtn = document.getElementById('auth0RedirectBtn');
  if (redirectBtn) {
    redirectBtn.addEventListener('click', async () => {
      try {
        await loginWithAuth0();
      } catch (err) {
        showToast(`⚠️ Auth0 Error: ${err.message}`);
      }
    });
  }

  const mockBtn = document.getElementById('auth0MockBtn');
  if (mockBtn) {
    mockBtn.addEventListener('click', async () => {
      try {
        const token = await createLocalDevToken();
        setSession(token, { name: 'Demo Recruiter' });
        closeModal();
        showToast('🔓 Authenticated via Auth0! Full contact details unlocked.');
        init();
      } catch (err) {
        showToast(`⚠️ Error: ${err.message}`);
      }
    });
  }

  const applyBtn = document.getElementById('applyTokenBtn');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const val = document.getElementById('tokenInput').value.trim();
      if (!val) {
        showToast('Please enter a valid JWT token.');
        return;
      }
      setSession(val, { name: 'Verified Token' });
      closeModal();
      showToast('🔓 Token applied. Refreshing directory...');
      init();
    });
  }
}

// ── DOM Refs ─────────────────────────────────────────────────
const studentGrid   = document.getElementById('studentGrid');
const pagination    = document.getElementById('pagination');
const totalBadge    = document.getElementById('totalBadge');
const statsStrip    = document.getElementById('statsStrip');
const searchInput   = document.getElementById('searchInput');
const clearSearch   = document.getElementById('clearSearch');
const sortSelect    = document.getElementById('sortSelect');
const resultsCount  = document.getElementById('resultsCount');
const modalOverlay  = document.getElementById('modalOverlay');
const modalBody     = document.getElementById('modalBody');
const modalClose    = document.getElementById('modalClose');
const toast         = document.getElementById('toast');
const authBtn       = document.getElementById('authBtn');

// ── Init ─────────────────────────────────────────────────────
async function init() {
  await handleAuthCallback();
  updateAuthBtnUI();

  try {
    const headers = getRequestHeaders();
    const [studentsRes, statsRes] = await Promise.all([
      fetch(`${API_BASE}/students`, { headers }),
      fetch(`${API_BASE}/stats`, { headers }),
    ]);
    const { data, privacy } = await studentsRes.json();
    const { data: stats } = await statsRes.json();

    allStudents = data;
    totalBadge.textContent = `${data.length} Students`;
    renderStatsStrip(stats);
    applyFilters();

    if (privacy?.notice && getStoredToken()) {
      showToast('🔓 Authenticated via Auth0: Full contact details unlocked.');
    }
  } catch (err) {
    studentGrid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-msg">Cannot reach API at ${API_BASE}.<br/>Make sure the Node.js server is running on port 3000.</div></div>`;
    console.error(err);
  }
}

if (authBtn) {
  authBtn.addEventListener('click', async () => {
    const token = getStoredToken();
    if (token) {
      if (confirm('Sign out of Auth0 session?')) {
        clearSession();
        showToast('🔒 Signed out. Returned to Privacy-Masked mode.');
        init();
      }
    } else {
      openAuthModal();
    }
  });
}

// ── Stats Strip ───────────────────────────────────────────────
function renderStatsStrip(stats) {
  const maxCount = Math.max(...Object.values(stats.stackBreakdown).map(s => s.studentCount));
  statsStrip.innerHTML = Object.entries(stats.stackBreakdown).map(([key, s]) => {
    const meta = STACK_META[key];
    const pct  = Math.round((s.studentCount / maxCount) * 100);
    return `
      <div class="stat-pill" data-stack="${key}" title="Filter by ${key}">
        <span class="stat-dot" style="background:${meta.dot}"></span>
        <span class="stat-name">${key}</span>
        <div class="stat-bar-wrap">
          <div class="stat-bar-bg"><div class="stat-bar-fill" style="width:${pct}%;background:${meta.dot}"></div></div>
        </div>
        <span class="stat-count">${s.studentCount}</span>
      </div>`;
  }).join('');

  // Click stat pill → set filter
  statsStrip.querySelectorAll('.stat-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const stack = pill.dataset.stack;
      setStackFilter(stack);
    });
  });
}

// ── Filters / Sort ────────────────────────────────────────────
function applyFilters() {
  let result = [...allStudents];

  // Stack filter
  if (activeStack !== 'ALL') {
    result = result.filter(s => s.technicalSkills.some(ts => ts.stack === activeStack));
  }

  // Search
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)
    );
  }

  // Sort
  result.sort((a, b) => {
    switch (sortMode) {
      case 'id-asc':    return a.id - b.id;
      case 'id-desc':   return b.id - a.id;
      case 'name-asc':  return a.name.localeCompare(b.name);
      case 'name-desc': return b.name.localeCompare(a.name);
      default: return 0;
    }
  });

  filtered = result;
  currentPage = 1;
  renderResultsBar();
  renderPage();
  renderPagination();
}

function renderResultsBar() {
  const filterNote = activeStack !== 'ALL' ? ` in <strong>${activeStack}</strong>` : '';
  const searchNote = searchQuery ? ` matching "<em>${searchQuery}</em>"` : '';
  resultsCount.innerHTML = `Showing <span>${filtered.length}</span> student${filtered.length !== 1 ? 's' : ''}${filterNote}${searchNote}`;
}

// ── Grid ──────────────────────────────────────────────────────
function renderPage() {
  const start = (currentPage - 1) * PAGE_SIZE;
  const slice = filtered.slice(start, start + PAGE_SIZE);

  if (!slice.length) {
    studentGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <div class="empty-state-msg">No students match your filters.</div>
      </div>`;
    return;
  }

  studentGrid.innerHTML = slice.map((s, i) => buildCard(s, i)).join('');
  studentGrid.querySelectorAll('.student-card').forEach(card => {
    card.addEventListener('click', () => openModal(+card.dataset.id));
  });
}

function buildCard(s, idx) {
  const [g1, g2] = AVATAR_GRADIENTS[s.id % AVATAR_GRADIENTS.length];
  const initials = s.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const delay    = Math.min(idx * 40, 400);
  const stacks   = s.technicalSkills.map(ts => `
    <span class="stack-chip ${STACK_META[ts.stack]?.chipClass ?? ''}">
      <span class="proficiency-dot ${PROFICIENCY_CLASS[ts.proficiencyLevel] ?? ''}"></span>${ts.stack}
    </span>`).join('');

  const privacyPill = s.isContactMasked
    ? '<span class="privacy-badge" title="Contact info masked for privacy protection">🔒 Masked</span>'
    : '<span class="privacy-badge unmasked" title="Authenticated unmasked access">🔓 Verified Contact</span>';

  return `
    <article class="student-card" data-id="${s.id}" style="animation-delay:${delay}ms">
      <div class="card-header">
        <div class="avatar" style="background:linear-gradient(135deg,${g1},${g2})">${initials}</div>
        <div class="card-meta">
          <div class="card-name" title="${s.name}">${s.name}</div>
          <div class="card-email" title="${s.email}">${s.email}</div>
        </div>
        <span class="card-id">#${s.id}</span>
      </div>
      <div class="card-mobile">📱 ${s.mobile} ${privacyPill}</div>
      <div class="card-stacks">${stacks}</div>
    </article>`;
}

// ── Pagination ────────────────────────────────────────────────
function renderPagination() {
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  if (totalPages <= 1) { pagination.innerHTML = ''; return; }

  const pages = [];
  // Prev
  pages.push(`<button class="page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>← Prev</button>`);

  // Page numbers
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2) {
      pages.push(`<button class="page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`);
    } else if (Math.abs(p - currentPage) === 3) {
      pages.push(`<span style="color:var(--text-muted);padding:0 4px">…</span>`);
    }
  }

  // Next
  pages.push(`<button class="page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>Next →</button>`);
  pagination.innerHTML = pages.join('');

  pagination.querySelectorAll('.page-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPage = +btn.dataset.page;
      renderPage();
      renderPagination();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

// ── Modal ─────────────────────────────────────────────────────
function openModal(id) {
  const s = allStudents.find(st => st.id === id);
  if (!s) return;

  const [g1, g2] = AVATAR_GRADIENTS[s.id % AVATAR_GRADIENTS.length];
  const initials  = s.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const skillBlocks = s.technicalSkills.map(ts => {
    const meta  = STACK_META[ts.stack] ?? {};
    const tags  = ts.subSkills.map(sk => `<span class="sub-skill-tag">${sk}</span>`).join('');
    const pClass = PROFICIENCY_CLASS[ts.proficiencyLevel] ?? '';
    return `
      <div class="skill-block">
        <div class="skill-block-header">
          <span class="skill-block-name" style="color:${meta.color}">${meta.label ?? ts.stack}</span>
          <span class="skill-block-badge" style="background:${meta.color}22;color:${meta.color};border:1px solid ${meta.color}44">
            <span class="proficiency-dot ${pClass}"></span>${ts.proficiencyLevel}
          </span>
        </div>
        <div class="sub-skill-list">${tags}</div>
      </div>`;
  }).join('');

  const privacyNote = s.isContactMasked
    ? '<span style="font-size:0.75rem;color:var(--accent-amber);margin-left:6px">(🔒 Masked for Privacy)</span>'
    : '<span style="font-size:0.75rem;color:var(--accent-green);margin-left:6px">(🔓 Verified)</span>';

  modalBody.innerHTML = `
    <div class="modal-avatar-row">
      <div class="modal-avatar" style="background:linear-gradient(135deg,${g1},${g2})">${initials}</div>
      <div>
        <div class="modal-name">${s.name}</div>
        <div class="modal-id">Student ID #${s.id}</div>
      </div>
    </div>
    <div class="modal-info-grid">
      <div class="info-box">
        <div class="info-box-label">Email ${privacyNote}</div>
        <div class="info-box-value">${s.email}</div>
      </div>
      <div class="info-box">
        <div class="info-box-label">Mobile ${privacyNote}</div>
        <div class="info-box-value">${s.mobile}</div>
      </div>
      <div class="info-box">
        <div class="info-box-label">Enrolled Year</div>
        <div class="info-box-value">${s.enrolledYear}</div>
      </div>
      <div class="info-box">
        <div class="info-box-label">Graduation Year</div>
        <div class="info-box-value">${s.graduationYear}</div>
      </div>
    </div>
    <div class="modal-section-title">Technical Skills (${s.technicalSkills.length} Stack${s.technicalSkills.length > 1 ? 's' : ''})</div>
    ${skillBlocks}`;

  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

// ── Event Listeners ───────────────────────────────────────────
// Stack filter buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => setStackFilter(btn.dataset.stack));
});

function setStackFilter(stack) {
  activeStack = stack;
  document.querySelectorAll('.filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.stack === stack);
  });
  applyFilters();
}

// Search
searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value.trim();
  clearSearch.classList.toggle('visible', !!searchQuery);
  applyFilters();
});

clearSearch.addEventListener('click', () => {
  searchInput.value = '';
  searchQuery = '';
  clearSearch.classList.remove('visible');
  applyFilters();
  searchInput.focus();
});

// Sort
sortSelect.addEventListener('change', () => {
  sortMode = sortSelect.value;
  applyFilters();
});

// Modal close
modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ── Toast helper ──────────────────────────────────────────────
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}

// ── Boot ──────────────────────────────────────────────────────
init();
