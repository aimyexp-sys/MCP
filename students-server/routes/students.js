// ============================================================
//  routes/students.js  –  All student-related API routes
// ============================================================

const express = require("express");
const router = express.Router();
const { students, TECH_STACKS } = require("../data/students");

// ── Utility: paginate an array ───────────────────────────────
function paginate(arr, page, limit) {
  const start = (page - 1) * limit;
  const end = start + limit;
  return arr.slice(start, end);
}

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
    const paginatedData = paginate(result, page, limit);

    res.status(200).json({
      success: true,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
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

  res.status(200).json({ success: true, data: student });
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

  const filtered = students.filter((s) =>
    s.technicalSkills.some((ts) => ts.stack === stackName)
  );

  res.status(200).json({
    success: true,
    stack: stackName,
    label: TECH_STACKS[stackName].label,
    total: filtered.length,
    data: filtered,
  });
});

module.exports = router;
