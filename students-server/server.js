// ============================================================
//  server.js  –  Entry point for the Student API Server
// ============================================================

const express = require("express");
const cors    = require("cors");
const morgan  = require("morgan");

const studentRoutes = require("./routes/students");
const statsRoutes   = require("./routes/stats");

const { getCorsOptions } = require("./middleware/security");
const { optionalAuth } = require("./middleware/auth");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────────
app.use(cors(getCorsOptions()));

// SEC-06: Custom Morgan logger that redacts Authorization Bearer tokens
morgan.token("authorization", (req) => {
  return req.headers["authorization"] ? "Bearer [REDACTED]" : "-";
});
app.use(morgan(":method :url :status :res[content-length] - :response-time ms [Auth: :authorization]"));
app.use(express.json());

// ── Health Check & API Directory ─────────────────────────────
app.get("/", optionalAuth, (req, res) => {
  res.status(200).json({
    message: "🎓 Student API Server is running!",
    version: "2.0.0",
    security: {
      authHeader: "Authorization: Bearer <Auth0_Token>",
      authenticated: Boolean(req.user),
      user: req.user ? { sub: req.user.sub, scopes: req.user.scopes } : null,
      privacyPolicy: "Personal student contact details (email, mobile) are masked on unauthenticated requests."
    },
    endpoints: {
      "GET /api/students":                   "Fetch all students (masked unless authenticated; supports ?page, ?limit, ?stack, ?search)",
      "GET /api/students/:id":               "Fetch a single student by ID (masked unless authenticated)",
      "GET /api/students/stack/:stackName":  "Fetch students by tech stack (MERN | MEAN | Python | Android | iOS)",
      "GET /api/students/auth/status":       "Check your current authentication status",
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
