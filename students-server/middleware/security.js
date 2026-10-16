// ============================================================
//  middleware/security.js – CORS, Auth & Data Minimization
// ============================================================

const STUDENT_API_KEY = process.env.STUDENT_API_KEY || "student-api-secret-key-2026";

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
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS policy violation: origin '${origin}' is not in allowed origins.`));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
    credentials: true
  };
}

/**
 * Check if request has valid Student API credentials
 */
function isAuthorized(req) {
  const apiKey =
    req.headers["x-api-key"] ||
    (req.headers["authorization"]?.startsWith("Bearer ")
      ? req.headers["authorization"].slice(7)
      : null) ||
    req.query.apiKey;

  return Boolean(apiKey && apiKey === STUDENT_API_KEY);
}

/**
 * Middleware that requires authentication
 */
function requireAuth(req, res, next) {
  if (!isAuthorized(req)) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
      message: "Authentication required to access protected student data. Provide a valid API key via 'X-API-Key' or 'Authorization: Bearer <key>'."
    });
  }
  next();
}

/**
 * Minimize / mask email address for privacy
 * Example: 'aarav885@outlook.com' -> 'aa***5@outlook.com'
 */
function maskEmail(email) {
  if (!email || !email.includes("@")) return "***@***.com";
  const [user, domain] = email.split("@");
  if (user.length <= 2) {
    return `${user[0]}***@${domain}`;
  }
  return `${user.slice(0, 2)}***${user.slice(-1)}@${domain}`;
}

/**
 * Minimize / mask mobile number for privacy
 * Example: '+91 7786950113' -> '+91 77*****113'
 */
function maskMobile(mobile) {
  if (!mobile) return "+91 **********";
  const clean = mobile.trim();
  if (clean.length > 7) {
    const spaceIdx = clean.indexOf(" ");
    const prefix = spaceIdx !== -1 ? clean.slice(0, spaceIdx + 3) : clean.slice(0, 5);
    const suffix = clean.slice(-3);
    return `${prefix}*****${suffix}`;
  }
  return "+91 **********";
}

/**
 * Format student record based on authorization status
 */
function formatStudent(student, authorized = false) {
  if (authorized) {
    return {
      ...student,
      isContactMasked: false
    };
  }

  return {
    ...student,
    email: maskEmail(student.email),
    mobile: maskMobile(student.mobile),
    isContactMasked: true
  };
}

module.exports = {
  STUDENT_API_KEY,
  getCorsOptions,
  isAuthorized,
  requireAuth,
  maskEmail,
  maskMobile,
  formatStudent
};
