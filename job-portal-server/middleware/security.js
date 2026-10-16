// ============================================================
//  middleware/security.js – CORS, Mutation Auth & Recruiter Privacy
// ============================================================

const JOB_ADMIN_KEY = process.env.JOB_ADMIN_KEY || process.env.API_KEY || "job-admin-secret-key-2026";

/**
 * Configure strict CORS allowlist
 */
function getCorsOptions() {
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim())
    : [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://localhost:4000",
        "http://localhost:8080",
        "https://exp-portal-mcp-server.onrender.com"
      ];

  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, mobile, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS policy violation: origin '${origin}' is not in allowed origins.`));
    },
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
    credentials: true
  };
}

/**
 * Check if request carries valid Job Admin / Recruiter credentials
 */
function isAuthorized(req) {
  const apiKey =
    req.headers["x-api-key"] ||
    (req.headers["authorization"]?.startsWith("Bearer ")
      ? req.headers["authorization"].slice(7)
      : null) ||
    req.query.apiKey;

  return Boolean(apiKey && apiKey === JOB_ADMIN_KEY);
}

/**
 * Enforce authentication for mutation endpoints (POST, DELETE)
 */
function requireAuth(req, res, next) {
  if (!isAuthorized(req)) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
      message: "Authentication required to perform mutations on job postings. Provide a valid API key via 'X-API-Key' or 'Authorization: Bearer <key>'."
    });
  }
  next();
}

/**
 * Sanitize job postings to minimize recruiter personal contact exposure
 */
function sanitizeJob(job, authorized = false) {
  if (!job) return job;

  if (authorized) {
    return {
      ...job,
      isRecruiterContactMasked: false
    };
  }

  const company = job.company || {};
  const contact = company.contact || {};

  return {
    ...job,
    company: {
      ...company,
      contact: {
        ...contact,
        hrContactPerson: "Hiring Team [Protected - Apply via portal]",
        phone: "[Protected - Verified Employers Only]",
        email: contact.email || `careers@${(company.name || "company").toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
        website: contact.website || "https://example.com",
        address: contact.address || job.location || "Remote"
      }
    },
    isRecruiterContactMasked: true
  };
}

module.exports = {
  JOB_ADMIN_KEY,
  getCorsOptions,
  isAuthorized,
  requireAuth,
  sanitizeJob
};
