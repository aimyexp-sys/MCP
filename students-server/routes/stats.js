// ============================================================
//  routes/stats.js  –  Aggregate / stats endpoints
// ============================================================

const express = require("express");
const router = express.Router();
const { students, TECH_STACKS } = require("../data/students");

// ────────────────────────────────────────────────────────────
// GET /api/stats
//   Returns high-level summary statistics
// ────────────────────────────────────────────────────────────
router.get("/", (req, res) => {
  const stackCounts = {};

  Object.keys(TECH_STACKS).forEach((key) => {
    stackCounts[key] = {
      label: TECH_STACKS[key].label,
      studentCount: 0,
      proficiency: { Beginner: 0, Intermediate: 0, Advanced: 0 },
    };
  });

  students.forEach((student) => {
    student.technicalSkills.forEach((ts) => {
      if (stackCounts[ts.stack]) {
        stackCounts[ts.stack].studentCount++;
        stackCounts[ts.stack].proficiency[ts.proficiencyLevel]++;
      }
    });
  });

  res.status(200).json({
    success: true,
    data: {
      totalStudents: students.length,
      stackBreakdown: stackCounts,
    },
  });
});

module.exports = router;
