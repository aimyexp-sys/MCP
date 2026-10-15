// ============================================================
//  server.js  –  Entry point for the Student API Server
// ============================================================

const express = require("express");
const cors    = require("cors");
const morgan  = require("morgan");

const studentRoutes = require("./routes/students");
const statsRoutes   = require("./routes/stats");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// ── Health Check ─────────────────────────────────────────────
app.get("/", (req, res) => {
  res.status(200).json({
    message: "🎓 Student API Server is running!",
    version: "1.0.0",
    endpoints: {
      "GET /api/students":                   "Fetch all students (supports ?page, ?limit, ?stack, ?search)",
      "GET /api/students/:id":               "Fetch a single student by ID",
      "GET /api/students/stack/:stackName":  "Fetch students by tech stack (MERN | MEAN | Python | Android | iOS)",
      "GET /api/stats":                      "Get aggregate statistics by tech stack",
    },
  });
});

// ── Routes ───────────────────────────────────────────────────
app.use("/api/students", studentRoutes);
app.use("/api/stats",    statsRoutes);

// ── 404 Handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route '${req.originalUrl}' not found.` });
});

// ── Global Error Handler ─────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error("[ERROR]", err.stack);
  res.status(500).json({ success: false, message: "Something went wrong!", error: err.message });
});

// ── Start Server ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log("─────────────────────────────────────────────────");
  console.log(`  🎓  Student API Server`);
  console.log(`  🚀  Running at : http://localhost:${PORT}`);
  console.log(`  📋  All students : http://localhost:${PORT}/api/students`);
  console.log(`  📊  Stats        : http://localhost:${PORT}/api/stats`);
  console.log("─────────────────────────────────────────────────");
});
