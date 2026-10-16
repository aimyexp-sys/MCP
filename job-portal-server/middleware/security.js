// ============================================================
//  middleware/security.js – CORS & Data Sanitization
// ============================================================

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://localhost:4000",
  "http://localhost:8080",
  "https://students-portal.onrender.com",
  "https://job-portal-web.onrender.com",
  "https://exp-portal-mcp-server.onrender.com"
];

/**
 * Configure strict CORS policy (SEC-03: Exact origins, reject '*', credentials: false)
 */
function getCorsOptions() {
  const envOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
        .map((s) => s.trim())
        .filter((s) => s && s !== "*") // Strictly reject '*' wildcard
    : [];

  const allowedOriginsSet = new Set([...defaultAllowedOrigins, ...envOrigins]);

  return {
    origin: (origin, callback) => {
      // Calls without Origin (e.g. server-to-server, curl, CLI) are allowed past CORS,
      // but protected operations still require Authorization: Bearer <token>.
      if (!origin) return callback(null, true);

      if (allowedOriginsSet.has(origin)) {
        return callback(null, true);
      }
      // Unconfigured browser origins do NOT receive CORS headers
      return callback(null, false);
    },
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false
  };
}

/**
 * Sanitize job postings (SEC-02 is excluded per user instruction, preserving current behavior)
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
  getCorsOptions,
  sanitizeJob
};
