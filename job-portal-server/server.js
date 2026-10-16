// ============================================================
//  server.js – Entry point for the Job Portal Backend API
// ============================================================

const express = require("express");
const cors    = require("cors");
const morgan  = require("morgan");

const jobsRoutes = require("./routes/jobs");

const { getCorsOptions } = require("./middleware/security");
const { optionalAuth } = require("./middleware/auth");

const app  = express();
const PORT = process.env.PORT || 4000;

// ── Global Middleware ────────────────────────────────────────
app.use(cors(getCorsOptions()));

// SEC-06: Custom Morgan logger that redacts Authorization Bearer tokens
morgan.token("authorization", (req) => {
  return req.headers["authorization"] ? "Bearer [REDACTED]" : "-";
});
app.use(morgan(":method :url :status :res[content-length] - :response-time ms [Auth: :authorization]"));
app.use(express.json());

// ── Root / Health & API Directory ────────────────────────────
app.get("/", optionalAuth, (req, res) => {
  res.status(200).json({
    message: "🚀 Job Portal REST API Backend is running!",
    version: "2.0.0",
    description: "Backend service delivering 100+ realistic tech job vacancies categorized by modern tech stacks.",
    security: {
      authHeader: "Authorization: Bearer <Auth0_Token>",
      authenticated: Boolean(req.user),
      user: req.user ? { sub: req.user.sub, scopes: req.user.scopes } : null,
      mutationAuthRequired: true,
      recruiterPrivacyPolicy: "Recruiter personal phone numbers and direct contact names are masked on public endpoints."
    },
    primaryEndpoints: {
      "GET /api/jobs": "Retrieve ALL job postings (recruiter contact masked unless authenticated)",
      "GET /api/jobs?category=MERN": "Filter by modern tech stack (e.g. MERN, MEAN, Python/Django, Android, iOS)",
      "GET /api/jobs?search=react": "Search across titles, companies, descriptions, and skills",
      "GET /api/jobs?jobType=Remote": "Filter by job type (Full-Time, Remote, Hybrid, Contract)",
      "GET /api/jobs?experienceLevel=Senior": "Filter by experience level (Entry-Level, Mid-Level, Senior, Lead / Staff)",
      "GET /api/jobs/categories": "View distribution summary across modern tech stacks",
      "GET /api/jobs/category/:name": "View all postings for a designated tech category",
      "GET /api/jobs/:id": "Fetch single job vacancy detail by ID (e.g. JOB-001)",
      "GET /api/jobs/auth/status": "Check your current authentication status",
      "POST /api/jobs": "Create a new job posting [AUTHENTICATION REQUIRED]",
      "DELETE /api/jobs/:id": "Remove a job posting by ID [AUTHENTICATION REQUIRED]"
    },
    supportedTechStacks: [
      "MERN (MongoDB, Express, React, Node.js)",
      "MEAN (MongoDB, Express, Angular, Node.js)",
      "Python/Django (Django, DRF, Celery, PostgreSQL)",
      "Android (Kotlin, Jetpack Compose, MVVM)",
      "iOS (Swift, SwiftUI, Combine)",
      "DevOps / Cloud (AWS, Kubernetes, Terraform)",
      "AI / ML & Data (PyTorch, LangChain, Spark)",
      "Java / Spring Boot (Java 21, Spring Boot, Microservices)",
      "Flutter / Cross-Platform (Dart, Flutter, BLoC)"
    ],
    sampleRequest: `curl http://localhost:${PORT}/api/jobs`
  });
});

// ── API Routes ───────────────────────────────────────────────
app.use("/api/jobs", jobsRoutes);

// ── 404 Handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route Not Found",
    message: `Cannot ${req.method} ${req.originalUrl}. Check the root path / for available endpoints.`
  });
});

// ── Global Error Handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled Server Error:", err.stack);
  res.status(500).json({
    success: false,
    error: "Internal Server Error",
    message: err.message
  });
});

// ── Server Activation ────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log("=================================================");
  console.log(`💼 Job Portal API Server active on http://localhost:${PORT}`);
  console.log(`📄 Total Job Postings Available: 100`);
  console.log(`🌐 Endpoint: GET http://localhost:${PORT}/api/jobs`);
  console.log("=================================================");
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n⚠️  Port ${PORT} is already in use by another process.`);
    console.error(`👉 You can run on a different port using: PORT=${Number(PORT) + 1} npm start`);
    console.error(`👉 Or free port ${PORT} using: lsof -ti:${PORT} | xargs kill -9\n`);
  } else {
    console.error("Server error:", err);
  }
  process.exit(1);
});

module.exports = app;
