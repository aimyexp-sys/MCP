// ============================================================
//  StudentHub Portal – main.js
//  Connects to Student API at http://localhost:3000
// ============================================================

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

// ── Init ─────────────────────────────────────────────────────
async function init() {
  try {
    const [studentsRes, statsRes] = await Promise.all([
      fetch(`${API_BASE}/students`),
      fetch(`${API_BASE}/stats`),
    ]);
    const { data } = await studentsRes.json();
    const { data: stats } = await statsRes.json();

    allStudents = data;
    totalBadge.textContent = `${data.length} Students`;
    renderStatsStrip(stats);
    applyFilters();
  } catch (err) {
    studentGrid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-msg">Cannot reach API at ${API_BASE}.<br/>Make sure the Node.js server is running on port 3000.</div></div>`;
    console.error(err);
  }
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
      <div class="card-mobile">📱 ${s.mobile}</div>
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
        <div class="info-box-label">Email</div>
        <div class="info-box-value">${s.email}</div>
      </div>
      <div class="info-box">
        <div class="info-box-label">Mobile</div>
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
