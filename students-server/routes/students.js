// ============================================================
//  routes/students.js  –  All student-related API routes
// ============================================================

const express = require("express");
const router = express.Router();
const { students, TECH_STACKS } = require("../data/students");
const { isAuthorized, formatStudent } = require("../middleware/security");

// ── Utility: paginate an array ───────────────────────────────
function paginate(arr, page, limit) {
  const start = (page - 1) * limit;
  const end = start + limit;
  return arr.slice(start, end);
}

// ────────────────────────────────────────────────────────────
// GET /api/students/auth/status
//   Check authentication state and privileges
// ────────────────────────────────────────────────────────────
router.get("/auth/status", (req, res) => {
  const authorized = isAuthorized(req);
  res.status(200).json({
    success: true,
    authenticated: authorized,
    role: authorized ? "admin/recruiter" : "public",
    privacyStatus: authorized
      ? "Full contact visibility granted."
      : "Personal student data (emails, mobile numbers) is masked for privacy protection.",
  });
});

// ────────────────────────────────────────────────────────────
// GET /api/students
//   Query params (all optional):
//     page    – page number        (default: 1)
//     limit   – records per page   (default: 100, max: 100)
//     stack   – filter by stack    (MERN | MEAN | Python | Android | iOS)
//     search  – partial name / email search (case-insensitive)
// ────────────────────────────────────────────────────────────
router.get("/", (req, res) => {
  try {
    const authorized = isAuthorized(req);
    let result = [...students];

    // ── Filter by tech stack ─────────────────────────────────
    if (req.query.stack) {
      const stackFilter = req.query.stack.toUpperCase();
      result = result.filter((s) =>
        s.technicalSkills.some((ts) => ts.stack.toUpperCase() === stackFilter)
      );
    }

    // ── Search by name or email ──────────────────────────────
    if (req.query.search) {
      const keyword = req.query.search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(keyword) ||
          s.email.toLowerCase().includes(keyword)
      );
    }

    const total = result.length;

    // ── Pagination ───────────────────────────────────────────
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 100));
    const paginatedData = paginate(result, page, limit).map((s) =>
      formatStudent(s, authorized)
    );

    res.status(200).json({
      success: true,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      privacy: {
        contactMasked: !authorized,
        notice: authorized
          ? "Authenticated session: Unmasked student contact details provided."
          : "Personal contact info (emails, mobile numbers) masked. Provide X-API-Key or Authorization header for unmasked access.",
      },
      data: paginatedData,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error", error: err.message });
  }
});

// ────────────────────────────────────────────────────────────
// GET /api/students/:id
// ────────────────────────────────────────────────────────────
router.get("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const student = students.find((s) => s.id === id);

  if (!student) {
    return res.status(404).json({ success: false, message: `Student with id ${id} not found.` });
  }

  const authorized = isAuthorized(req);
  res.status(200).json({
    success: true,
    privacy: {
      contactMasked: !authorized,
      notice: authorized
        ? "Authenticated: Full contact details provided."
        : "Personal contact info masked. Provide X-API-Key or Authorization header for unmasked access.",
    },
    data: formatStudent(student, authorized),
  });
});

// ────────────────────────────────────────────────────────────
// GET /api/students/stack/:stackName
//   Returns students grouped by a specific stack with counts
// ────────────────────────────────────────────────────────────
router.get("/stack/:stackName", (req, res) => {
  const stackName = req.params.stackName.toUpperCase();
  const validStacks = Object.keys(TECH_STACKS);

  if (!validStacks.includes(stackName)) {
    return res.status(400).json({
      success: false,
      message: `Invalid stack. Valid values are: ${validStacks.join(", ")}`,
    });
  }

  const authorized = isAuthorized(req);
  const filtered = students
    .filter((s) => s.technicalSkills.some((ts) => ts.stack === stackName))
    .map((s) => formatStudent(s, authorized));

  res.status(200).json({
    success: true,
    stack: stackName,
    label: TECH_STACKS[stackName].label,
    total: filtered.length,
    privacy: {
      contactMasked: !authorized,
      notice: authorized
        ? "Authenticated: Full contact details provided."
        : "Personal contact info masked.",
    },
    data: filtered,
  });
});

module.exports = router;

